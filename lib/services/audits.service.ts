"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { auditSchema, findingSchema } from "@/lib/validation/audit.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type { Audit, AuditFinding, AuditStatus, FindingType } from "@/lib/types/audit";

const AUDIT_SELECT = "*, auditor:profiles!audits_auditor_id_fkey(full_name)";

interface AuditRow {
  id: string;
  title: string;
  scope: string;
  criteria: string;
  auditor_id: string;
  planned_date: string;
  status: AuditStatus;
  created_at: string;
  auditor: { full_name: string } | null;
}

function toAudit(row: AuditRow): Audit {
  return {
    id: row.id,
    title: row.title,
    scope: row.scope,
    criteria: row.criteria,
    auditorId: row.auditor_id,
    auditorName: row.auditor?.full_name || "—",
    plannedDate: row.planned_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listAudits(): Promise<Audit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("audits").select(AUDIT_SELECT).order("planned_date", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as AuditRow[]).map(toAudit);
}

export async function getAuditById(id: string): Promise<Audit | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("audits").select(AUDIT_SELECT).eq("id", id).single();
  if (error || !data) return null;
  return toAudit(data as unknown as AuditRow);
}

export async function createAudit(formData: FormData): Promise<ActionResult> {
  const parsed = auditSchema.safeParse({
    title: formData.get("title"),
    scope: formData.get("scope"),
    criteria: formData.get("criteria"),
    auditorId: formData.get("auditorId"),
    plannedDate: formData.get("plannedDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { title, scope, criteria, auditorId, plannedDate } = parsed.data;
  const { data, error } = await supabase
    .from("audits")
    .insert({
      title,
      scope,
      criteria,
      auditor_id: auditorId,
      planned_date: plannedDate,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Impossible de créer l'audit." };

  revalidatePath("/audits");
  redirect(`/audits/${data.id}`);
}

export async function updateAuditStatus(id: string, status: AuditStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("audits").update({ status }).eq("id", id);
  if (error) return { error: "Impossible de mettre à jour le statut." };
  revalidatePath(`/audits/${id}`);
  revalidatePath("/audits");
  return { error: null };
}

function toFinding(row: {
  id: string;
  audit_id: string;
  type: FindingType;
  description: string;
  action_id: string | null;
  created_at: string;
}): AuditFinding {
  return {
    id: row.id,
    auditId: row.audit_id,
    type: row.type,
    description: row.description,
    actionId: row.action_id,
    createdAt: row.created_at,
  };
}

export async function listFindings(auditId: string): Promise<AuditFinding[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_findings")
    .select("*")
    .eq("audit_id", auditId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(toFinding);
}

export async function addFinding(auditId: string, formData: FormData): Promise<ActionResult> {
  const parsed = findingSchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { type, description } = parsed.data;
  const { error } = await supabase
    .from("audit_findings")
    .insert({ audit_id: auditId, type, description, created_by: user.id });

  if (error) return { error: "Impossible d'ajouter ce constat." };

  revalidatePath(`/audits/${auditId}`);
  return { error: null };
}
