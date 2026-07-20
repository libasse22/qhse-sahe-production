"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { incidentSchema } from "@/lib/validation/incident.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type { Incident, IncidentCategory, IncidentSeverity, IncidentStatus } from "@/lib/types/incidents";

const INCIDENT_SELECT =
  "*, reporter:profiles!incidents_reported_by_fkey(full_name), assignee:profiles!incidents_assigned_to_fkey(full_name)";

interface IncidentRow {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: string;
  occurred_at: string;
  reported_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  reporter: { full_name: string } | null;
  assignee: { full_name: string } | null;
}

function toIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity,
    status: row.status,
    location: row.location,
    occurredAt: row.occurred_at,
    reportedBy: row.reported_by,
    reportedByName: row.reporter?.full_name || "—",
    assignedTo: row.assigned_to,
    assignedToName: row.assignee?.full_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Liste les incidents visibles par l'utilisateur courant.
 * La RLS filtre automatiquement : un employé ne voit que ses incidents
 * déclarés/assignés, un manager QHSE ou admin voit tout.
 */
export async function listIncidents(): Promise<Incident[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select(INCIDENT_SELECT)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as IncidentRow[]).map(toIncident);
}

export async function listIncidentsByEquipment(equipmentId: string): Promise<Incident[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select(INCIDENT_SELECT)
    .eq("equipment_id", equipmentId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as IncidentRow[]).map(toIncident);
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select(INCIDENT_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return toIncident(data as unknown as IncidentRow);
}

export async function createIncident(formData: FormData): Promise<ActionResult> {
  const parsed = incidentSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    severity: formData.get("severity"),
    location: formData.get("location"),
    occurredAt: formData.get("occurredAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { title, description, category, severity, location, occurredAt } = parsed.data;

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      title,
      description,
      category: category as IncidentCategory,
      severity: severity as IncidentSeverity,
      location,
      occurred_at: new Date(occurredAt).toISOString(),
      reported_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Impossible d'enregistrer l'incident." };
  }

  revalidatePath("/incidents");
  redirect(`/incidents/${data.id}`);
}

/**
 * Déclaration rapide utilisée par l'interface Ouvrier : uniquement la
 * gravité est requise. Le titre, la catégorie et la date sont déduits
 * automatiquement pour ne demander aucune saisie inutile. Redirige vers la
 * page de l'incident où l'ouvrier peut ensuite joindre photos et message
 * vocal.
 */
export interface QueuedIncidentPayload {
  clientGeneratedId: string;
  severity: IncidentSeverity;
  location: string;
  description: string;
  occurredAt: string;
  equipmentId?: string | null;
}

export interface SyncIncidentResult extends ActionResult {
  incidentId?: string;
}

/**
 * Utilisée par le gestionnaire de synchronisation hors-ligne
 * (lib/offline/sync-manager.ts) pour envoyer un brouillon mis en file
 * d'attente localement pendant une coupure réseau. Idempotente : si
 * clientGeneratedId correspond déjà à un incident existant (renvoi après une
 * précédente tentative dont l'accusé de réception s'est perdu), l'incident
 * existant est simplement retourné au lieu d'en créer un second.
 */
export async function syncQueuedIncident(payload: QueuedIncidentPayload): Promise<SyncIncidentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { data: existing } = await supabase
    .from("incidents")
    .select("id")
    .eq("client_generated_id", payload.clientGeneratedId)
    .maybeSingle();

  if (existing) {
    return { error: null, incidentId: existing.id };
  }

  const occurred = new Date(payload.occurredAt);
  const title = `Signalement du ${occurred.toLocaleDateString("fr-FR")} à ${occurred.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      title,
      description: payload.description,
      category: "autre",
      severity: payload.severity,
      location: payload.location || "Non précisé",
      occurred_at: occurred.toISOString(),
      reported_by: user.id,
      client_generated_id: payload.clientGeneratedId,
      equipment_id: payload.equipmentId || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Impossible d'enregistrer le signalement." };
  }

  revalidatePath("/ouvrier/mes-declarations");
  return { error: null, incidentId: data.id };
}

export async function updateIncident(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = incidentSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    severity: formData.get("severity"),
    location: formData.get("location"),
    occurredAt: formData.get("occurredAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = await createClient();
  const { title, description, category, severity, location, occurredAt } = parsed.data;

  const { error } = await supabase
    .from("incidents")
    .update({
      title,
      description,
      category: category as IncidentCategory,
      severity: severity as IncidentSeverity,
      location,
      occurred_at: new Date(occurredAt).toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: "Impossible de modifier cet incident (droits insuffisants ou déjà traité)." };
  }

  revalidatePath(`/incidents/${id}`);
  revalidatePath("/incidents");
  redirect(`/incidents/${id}`);
}

/**
 * Fait évoluer le statut d'un incident et/ou l'assigne à un utilisateur.
 * Réservé aux managers QHSE / admin via la policy RLS incidents_update_qhse.
 */
export async function updateIncidentStatus(
  id: string,
  status: IncidentStatus,
  assignedTo: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("incidents")
    .update({ status, assigned_to: assignedTo })
    .eq("id", id);

  if (error) {
    return { error: "Impossible de mettre à jour le statut." };
  }

  revalidatePath(`/incidents/${id}`);
  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteIncident(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("incidents").delete().eq("id", id);

  if (error) {
    return { error: "Impossible de supprimer cet incident." };
  }

  revalidatePath("/incidents");
  redirect("/incidents");
}
