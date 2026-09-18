"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";
import type {
  Meeting,
  MeetingType,
  MeetingStatus,
  MeetingParticipant,
  MeetingAgendaItem,
  MeetingDecision,
  MeetingActionItem,
  MeetingHistoryEvent,
  MeetingDetails,
  MeetingSuggestion,
  AttendanceStatus,
  AgendaSourceType,
} from "@/lib/types/meeting";
import { createDocument } from "@/lib/services/documents.service";

// ----------------------------------------------------------------------------
// 1. GENERATION TRANSACTIONNELLE DU REFERENCE REUNION (REU-2026-001)
// ----------------------------------------------------------------------------

export async function generateMeetingReference(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) return null;

  const { data: codeData, error } = await supabase.rpc("generate_meeting_reference", {
    p_company_id: profile.company_id,
  });

  if (error || !codeData) {
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 900) + 100;
    return `REU-${year}-${rand}`;
  }

  return codeData as string;
}

// ----------------------------------------------------------------------------
// 2. LISTING ET DETAILS DES REUNIONS
// ----------------------------------------------------------------------------

export async function listMeetings(options?: {
  meetingType?: MeetingType | "all";
  status?: MeetingStatus | "all";
  searchQuery?: string;
}): Promise<Meeting[]> {
  const supabase = await createClient();

  let query = supabase
    .from("meetings")
    .select("*, organizer:profiles!meetings_organizer_user_id_fkey(full_name), secretary:profiles!meetings_secretary_user_id_fkey(full_name)")
    .order("scheduled_at", { ascending: false });

  if (options?.meetingType && options.meetingType !== "all") {
    query = query.eq("meeting_type", options.meetingType);
  }
  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }
  if (options?.searchQuery && options.searchQuery.trim() !== "") {
    const q = `%${options.searchQuery.trim()}%`;
    query = query.or(`title.ilike.${q},reference.ilike.${q},location.ilike.${q}`);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => {
    const org = row.organizer as unknown as { full_name: string } | null;
    const sec = row.secretary as unknown as { full_name: string } | null;

    return {
      id: row.id,
      companyId: row.company_id,
      reference: row.reference,
      title: row.title,
      meetingType: row.meeting_type as MeetingType,
      status: row.status as MeetingStatus,
      scheduledAt: row.scheduled_at,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      location: row.location,
      organizerUserId: row.organizer_user_id,
      organizerName: org?.full_name || null,
      secretaryUserId: row.secretary_user_id,
      secretaryName: sec?.full_name || null,
      description: row.description,
      agenda: row.agenda,
      notes: row.notes,
      documentId: row.document_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function getMeetingDetails(meetingId: string): Promise<MeetingDetails | null> {
  const supabase = await createClient();

  const { data: meetingRow, error: meetingErr } = await supabase
    .from("meetings")
    .select("*, organizer:profiles!meetings_organizer_user_id_fkey(full_name), secretary:profiles!meetings_secretary_user_id_fkey(full_name)")
    .eq("id", meetingId)
    .single();

  if (meetingErr || !meetingRow) return null;

  const org = meetingRow.organizer as unknown as { full_name: string } | null;
  const sec = meetingRow.secretary as unknown as { full_name: string } | null;

  const meeting: Meeting = {
    id: meetingRow.id,
    companyId: meetingRow.company_id,
    reference: meetingRow.reference,
    title: meetingRow.title,
    meetingType: meetingRow.meeting_type as MeetingType,
    status: meetingRow.status as MeetingStatus,
    scheduledAt: meetingRow.scheduled_at,
    startedAt: meetingRow.started_at,
    endedAt: meetingRow.ended_at,
    location: meetingRow.location,
    organizerUserId: meetingRow.organizer_user_id,
    organizerName: org?.full_name || null,
    secretaryUserId: meetingRow.secretary_user_id,
    secretaryName: sec?.full_name || null,
    description: meetingRow.description,
    agenda: meetingRow.agenda,
    notes: meetingRow.notes,
    documentId: meetingRow.document_id,
    createdBy: meetingRow.created_by,
    createdAt: meetingRow.created_at,
    updatedAt: meetingRow.updated_at,
  };

  const [participantsRes, agendaRes, decisionsRes, actionsRes, historyRes, documentRes] = await Promise.all([
    supabase.from("meeting_participants").select("*").eq("meeting_id", meetingId).order("created_at", { ascending: true }),
    supabase.from("meeting_agenda_items").select("*").eq("meeting_id", meetingId).order("position", { ascending: true }),
    supabase.from("meeting_decisions").select("*, responsible:profiles!meeting_decisions_responsible_user_id_fkey(full_name)").eq("meeting_id", meetingId).order("created_at", { ascending: true }),
    supabase.from("meeting_action_items").select("*, responsible:profiles!meeting_action_items_responsible_user_id_fkey(full_name)").eq("meeting_id", meetingId).order("created_at", { ascending: true }),
    supabase.from("meeting_history").select("*").eq("meeting_id", meetingId).order("created_at", { ascending: false }),
    meetingRow.document_id
      ? supabase.from("documents").select("storage_path").eq("id", meetingRow.document_id).single().then((res) => res.data)
      : Promise.resolve(null),
  ]);

  let documentUrl: string | null = null;
  if (documentRes?.storage_path) {
    const { data: signed } = await supabase.storage.from("qhse-documents").createSignedUrl(documentRes.storage_path, 3600);
    documentUrl = signed?.signedUrl || null;
  }

  const participants: MeetingParticipant[] = (participantsRes.data || []).map((row) => ({
    id: row.id,
    meetingId: row.meeting_id,
    userId: row.user_id,
    fullName: row.full_name,
    role: row.role,
    organization: row.organization,
    attendanceStatus: row.attendance_status as AttendanceStatus,
    signatureRequired: row.signature_required,
    createdAt: row.created_at,
  }));

  const agendaItems: MeetingAgendaItem[] = (agendaRes.data || []).map((row) => ({
    id: row.id,
    meetingId: row.meeting_id,
    position: row.position,
    title: row.title,
    description: row.description,
    sourceType: row.source_type as AgendaSourceType | null,
    sourceId: row.source_id,
    status: row.status,
    createdAt: row.created_at,
  }));

  const decisions: MeetingDecision[] = (decisionsRes.data || []).map((row) => {
    const resp = row.responsible as unknown as { full_name: string } | null;
    return {
      id: row.id,
      meetingId: row.meeting_id,
      agendaItemId: row.agenda_item_id,
      decisionText: row.decision_text,
      decisionType: row.decision_type,
      responsibleUserId: row.responsible_user_id,
      responsibleName: resp?.full_name || null,
      deadline: row.deadline,
      status: row.status,
      createdAt: row.created_at,
    };
  });

  const actionItems: MeetingActionItem[] = (actionsRes.data || []).map((row) => {
    const resp = row.responsible as unknown as { full_name: string } | null;
    return {
      id: row.id,
      meetingId: row.meeting_id,
      decisionId: row.decision_id,
      title: row.title,
      description: row.description,
      responsibleUserId: row.responsible_user_id,
      responsibleName: resp?.full_name || row.responsible_name || null,
      dueDate: row.due_date,
      priority: row.priority || "moyenne",
      status: row.status || "a_faire",
      actionId: row.action_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  const history: MeetingHistoryEvent[] = (historyRes.data || []).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    meetingId: row.meeting_id,
    eventType: row.event_type,
    actorId: row.actor_id,
    actorName: row.actor_name,
    details: row.details,
    createdAt: row.created_at,
  }));

  return {
    meeting,
    participants,
    agendaItems,
    decisions,
    actionItems,
    history,
    documentUrl,
  };
}

// ----------------------------------------------------------------------------
// 3. CREATION ET METTRE A JOUR LE WORKFLOW REUNION
// ----------------------------------------------------------------------------

export async function createMeeting(params: {
  title: string;
  meetingType: MeetingType;
  scheduledAt: string;
  location?: string;
  organizerUserId?: string;
  secretaryUserId?: string;
  description?: string;
  initialParticipants?: { fullName: string; role?: string; userId?: string; signatureRequired?: boolean }[];
  initialAgendaTitles?: string[];
}): Promise<ActionResult & { meetingId?: string; reference?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée" };

  const { data: profile } = await supabase.from("profiles").select("company_id, full_name").eq("id", user.id).single();
  if (!profile?.company_id) return { error: "Profil entreprise introuvable" };

  const ref = (await generateMeetingReference()) || `REU-${new Date().getFullYear()}-001`;

  const { data: meetingData, error: insertErr } = await supabase
    .from("meetings")
    .insert({
      company_id: profile.company_id,
      reference: ref,
      title: params.title.trim(),
      meeting_type: params.meetingType,
      scheduled_at: params.scheduledAt,
      location: params.location?.trim() || null,
      organizer_user_id: params.organizerUserId || user.id,
      secretary_user_id: params.secretaryUserId || null,
      description: params.description?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !meetingData) return { error: `Impossible de créer la réunion: ${insertErr?.message}` };

  const meetingId = meetingData.id;

  // Organisateur comme participant par défaut
  await supabase.from("meeting_participants").insert({
    meeting_id: meetingId,
    user_id: params.organizerUserId || user.id,
    full_name: profile.full_name || "Organisateur",
    role: "Organisateur",
    attendance_status: "present",
    signature_required: true,
  });

  // Participants additionnels
  if (params.initialParticipants && params.initialParticipants.length > 0) {
    const toInsert = params.initialParticipants.map((p) => ({
      meeting_id: meetingId,
      user_id: p.userId || null,
      full_name: p.fullName,
      role: p.role || "Participant",
      attendance_status: "present",
      signature_required: p.signatureRequired ?? false,
    }));
    await supabase.from("meeting_participants").insert(toInsert);
  }

  // Points à l'ordre du jour initiaux
  if (params.initialAgendaTitles && params.initialAgendaTitles.length > 0) {
    const items = params.initialAgendaTitles.map((title, idx) => ({
      meeting_id: meetingId,
      position: idx + 1,
      title: title.trim(),
      source_type: "manual",
    }));
    await supabase.from("meeting_agenda_items").insert(items);
  }

  // Log historique
  await supabase.from("meeting_history").insert({
    company_id: profile.company_id,
    meeting_id: meetingId,
    event_type: "meeting_created",
    actor_id: user.id,
    actor_name: profile.full_name || "Utilisateur",
    details: { reference: ref, title: params.title },
  });

  revalidatePath("/reunions");
  return { error: null, meetingId, reference: ref };
}

export async function updateMeetingStatus(meetingId: string, newStatus: MeetingStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée" };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "en_cours") updatePayload.started_at = new Date().toISOString();
  if (newStatus === "validee" || newStatus === "signee" || newStatus === "archivee") {
    updatePayload.ended_at = new Date().toISOString();
  }

  const { error } = await supabase.from("meetings").update(updatePayload).eq("id", meetingId);
  if (error) return { error: `Impossible de mettre à jour la réunion: ${error.message}` };

  await supabase.from("meeting_history").insert({
    meeting_id: meetingId,
    event_type: "meeting_updated",
    actor_id: user.id,
    actor_name: profile?.full_name || "Utilisateur",
    details: { new_status: newStatus },
  });

  revalidatePath("/reunions");
  revalidatePath(`/reunions/${meetingId}`);
  return { error: null };
}

// ----------------------------------------------------------------------------
// 4. PREPARATION AUTOMATIQUE DE LA REUNION ("Préparer la réunion")
// ----------------------------------------------------------------------------

export async function prepareMeetingSuggestions(): Promise<MeetingSuggestion[]> {
  const supabase = await createClient();

  const [actionsRes, incidentsRes, auditsRes, inspectionsRes, permitsRes, epiRes, docsRes, prevMeetingsRes] =
    await Promise.all([
      supabase
        .from("actions_correctives")
        .select("id, code_reference, description, echeance, is_blocked, status, responsable:profiles!actions_correctives_responsable_id_fkey(full_name)")
        .or("is_blocked.eq.true,echeance.lt.now()")
        .neq("status", "cloturee")
        .limit(5),

      supabase
        .from("incidents")
        .select("id, code_reference, title, severity, occurred_at")
        .eq("severity", "critique")
        .neq("status", "cloture")
        .limit(5),

      supabase
        .from("audit_items")
        .select("id, title, requirement, status, audit:audits(title)")
        .eq("status", "non_conforme")
        .limit(5),

      supabase
        .from("inspection_runs")
        .select("id, title, score_percentage, completed_at")
        .eq("status", "completed")
        .lt("score_percentage", 80)
        .limit(5),

      supabase
        .from("work_permits")
        .select("id, permit_number, title, status, end_time")
        .or("status.eq.suspended,status.eq.in_progress")
        .limit(5),

      supabase
        .from("epi_assignments")
        .select("id, status, renewal_due_at, catalog_item:epi_catalog(name), employee:profiles!epi_assignments_employee_id_fkey(full_name)")
        .or("status.eq.defectueux,status.eq.expire")
        .limit(5),

      supabase
        .from("document_revisions")
        .select("id, document_id, revision_code, document:documents(title, code_reference)")
        .eq("verification_status", "a_verifier")
        .limit(5),

      supabase
        .from("meeting_action_items")
        .select("id, title, due_date, status, meeting:meetings(title, reference)")
        .neq("status", "cloturee")
        .limit(5),
    ]);

  const suggestions: MeetingSuggestion[] = [];

  // 1. Actions CAPA en retard / bloquées
  for (const act of actionsRes.data || []) {
    const resp = act.responsable as unknown as { full_name: string } | null;
    suggestions.push({
      sourceType: "capa",
      sourceId: act.id,
      title: `CAPA ${act.code_reference ? `[${act.code_reference}] ` : ""}${act.description}`,
      subtitle: act.is_blocked ? "🔴 Action bloquée (Intervention urgente)" : `Échéance dépassée le ${act.echeance}`,
      dateLabel: act.echeance || "Sans date",
      responsibleName: resp?.full_name || null,
      badgeText: act.is_blocked ? "Bloquée" : "En retard",
      badgeVariant: "destructive",
      href: `/actions`,
    });
  }

  // 2. Incidents critiques
  for (const inc of incidentsRes.data || []) {
    suggestions.push({
      sourceType: "incident",
      sourceId: inc.id,
      title: `Incident critique: ${inc.title}`,
      subtitle: `Survenu le ${new Date(inc.occurred_at).toLocaleDateString("fr-FR")}`,
      dateLabel: new Date(inc.occurred_at).toLocaleDateString("fr-FR"),
      badgeText: "Critique",
      badgeVariant: "destructive",
      href: `/incidents/${inc.id}`,
    });
  }

  // 3. Points d'audit non conformes
  for (const item of auditsRes.data || []) {
    const auditInfo = item.audit as unknown as { title: string } | null;
    suggestions.push({
      sourceType: "audit",
      sourceId: item.id,
      title: `Audit Non-Conformité: ${item.title}`,
      subtitle: auditInfo?.title || "Audit QHSE",
      dateLabel: "Audit récent",
      badgeText: "Non conforme",
      badgeVariant: "warning",
      href: `/audits`,
    });
  }

  // 4. Inspections avec score faible
  for (const insp of inspectionsRes.data || []) {
    suggestions.push({
      sourceType: "inspection",
      sourceId: insp.id,
      title: `Inspection non satisfaisante: ${insp.title}`,
      subtitle: `Score conformité : ${insp.score_percentage || 0} %`,
      dateLabel: insp.completed_at ? new Date(insp.completed_at).toLocaleDateString("fr-FR") : "Récente",
      badgeText: `${insp.score_percentage || 0}%`,
      badgeVariant: "warning",
      href: `/inspections/${insp.id}`,
    });
  }

  // 5. Permis de Travail (PtW) suspendus ou en cours
  for (const permit of permitsRes.data || []) {
    suggestions.push({
      sourceType: "work_permit",
      sourceId: permit.id,
      title: `Permis de travail ${permit.permit_number ? `[${permit.permit_number}] ` : ""}${permit.title}`,
      subtitle: `Statut : ${permit.status === "suspended" ? "🔴 Suspendu (Risque élevé)" : "En cours sur site"}`,
      dateLabel: permit.end_time ? new Date(permit.end_time).toLocaleDateString("fr-FR") : "Actif",
      badgeText: permit.status === "suspended" ? "Suspendu" : "En cours",
      badgeVariant: permit.status === "suspended" ? "destructive" : "warning",
      href: `/permis-de-travail/${permit.id}`,
    });
  }

  // 6. Équipements EPI défectueux ou expirés
  for (const epi of epiRes.data || []) {
    const itemInfo = epi.catalog_item as unknown as { name: string } | null;
    const empInfo = epi.employee as unknown as { full_name: string } | null;
    suggestions.push({
      sourceType: "epi",
      sourceId: epi.id,
      title: `EPI ${epi.status === "defectueux" ? "Défectueux" : "Expiré"}: ${itemInfo?.name || "Équipement de Protection"}`,
      subtitle: empInfo?.full_name ? `Affecté à : ${empInfo.full_name}` : "Non attribué",
      dateLabel: epi.renewal_due_at ? new Date(epi.renewal_due_at).toLocaleDateString("fr-FR") : "Contrôle requis",
      badgeText: epi.status === "defectueux" ? "Défectueux" : "Expiré",
      badgeVariant: "destructive",
      href: `/epi`,
    });
  }

  // 7. Documents externes à vérifier
  for (const docRev of docsRes.data || []) {
    const docInfo = docRev.document as unknown as { title: string; code_reference: string } | null;
    suggestions.push({
      sourceType: "document",
      sourceId: docRev.document_id,
      title: `Document externe à vérifier: ${docInfo?.title || "Document"}`,
      subtitle: `Révision ${docRev.revision_code} en attente de contrôle ISO 7.5`,
      dateLabel: "Contrôle Qualité",
      badgeText: "À vérifier",
      badgeVariant: "warning",
      href: `/documents/registre?verification=a_verifier`,
    });
  }

  // 8. Actions réunions antérieures encore ouvertes
  for (const prevAct of prevMeetingsRes.data || []) {
    const meetingInfo = prevAct.meeting as unknown as { title: string; reference: string } | null;
    suggestions.push({
      sourceType: "previous_meeting",
      sourceId: prevAct.id,
      title: `Suivi décision précédente: ${prevAct.title}`,
      subtitle: `Issue de ${meetingInfo?.reference || "Réunion précédente"}`,
      dateLabel: prevAct.due_date || "Sans échéance",
      badgeText: "Ouverte",
      badgeVariant: "secondary",
      href: `/reunions`,
    });
  }

  return suggestions;
}

export async function addAgendaItemsFromSuggestions(
  meetingId: string,
  items: { title: string; sourceType: AgendaSourceType; sourceId: string; description?: string }[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: existing } = await supabase.from("meeting_agenda_items").select("position").eq("meeting_id", meetingId);
  const startPos = (existing?.length || 0) + 1;

  const toInsert = items.map((item, idx) => ({
    meeting_id: meetingId,
    position: startPos + idx,
    title: item.title,
    description: item.description || null,
    source_type: item.sourceType,
    source_id: item.sourceId,
  }));

  const { error } = await supabase.from("meeting_agenda_items").insert(toInsert);
  if (error) return { error: `Impossible d'ajouter à l'ordre du jour: ${error.message}` };

  revalidatePath(`/reunions/${meetingId}`);
  return { error: null };
}

// ----------------------------------------------------------------------------
// 5. GENERATION ASSISTEE DU PV ET INTEGRATION GED MASTER DOCUMENT
// ----------------------------------------------------------------------------

export async function generateDraftPV(meetingId: string): Promise<{ htmlContent: string; title: string }> {
  const details = await getMeetingDetails(meetingId);
  if (!details) return { htmlContent: "<p>Réunion introuvable.</p>", title: "PV Réunion" };

  const { meeting: m, participants, agendaItems, decisions, actionItems } = details;

  const dateStr = new Date(m.scheduledAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const presents = participants.filter((p) => p.attendanceStatus === "present");
  const absents = participants.filter((p) => p.attendanceStatus === "absent");
  const excuses = participants.filter((p) => p.attendanceStatus === "excuse");

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="color: #0f172a; margin: 0; font-size: 22px;">PROCES-VERBAL DE REUNION — ${m.reference}</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;"><strong>${m.title}</strong> (${m.meetingType.toUpperCase()})</p>
      </div>

      <h3 style="color: #0369a1; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">A. INFORMATIONS GENERALES</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
        <tr><td style="padding: 4px; width: 30%;"><strong>Référence :</strong></td><td>${m.reference}</td></tr>
        <tr><td style="padding: 4px;"><strong>Date et heure :</strong></td><td>${dateStr}</td></tr>
        <tr><td style="padding: 4px;"><strong>Lieu / Emplacement :</strong></td><td>${m.location || "Information non renseignée"}</td></tr>
        <tr><td style="padding: 4px;"><strong>Organisateur :</strong></td><td>${m.organizerName || "Information non renseignée"}</td></tr>
        <tr><td style="padding: 4px;"><strong>Secrétaire de séance :</strong></td><td>${m.secretaryName || "Information non renseignée"}</td></tr>
      </table>

      <h3 style="color: #0369a1; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">B. PARTICIPANTS ET PRESENCES</h3>
      <div style="font-size: 13px; margin-bottom: 16px;">
        <p><strong>Présents (${presents.length}) :</strong> ${presents.map((p) => `${p.fullName} (${p.role || "Participant"})`).join(", ") || "Aucun présent enregistré"}</p>
        <p><strong>Excusés (${excuses.length}) :</strong> ${excuses.map((p) => p.fullName).join(", ") || "Aucun"}</p>
        <p><strong>Absents (${absents.length}) :</strong> ${absents.map((p) => p.fullName).join(", ") || "Aucun"}</p>
      </div>

      <h3 style="color: #0369a1; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">C. ORDRE DU JOUR</h3>
      <ol style="font-size: 13px; margin-bottom: 16px;">
        ${agendaItems.map((item) => `<li><strong>${item.title}</strong> ${item.description ? `— ${item.description}` : ""}</li>`).join("") || "<li>Information non renseignée</li>"}
      </ol>

      <h3 style="color: #0369a1; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">D. SYNTHESE DES DISCUSSIONS</h3>
      <div style="font-size: 13px; background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
        ${m.notes ? `<p>${m.notes.replace(/\n/g, "<br/>")}</p>` : "<p><em>Notes de séance non renseignées.</em></p>"}
      </div>

      <h3 style="color: #0369a1; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">E. DECISIONS PRISES</h3>
      <ul style="font-size: 13px; margin-bottom: 16px;">
        ${decisions.map((d) => `<li><strong>${d.decisionText}</strong> ${d.responsibleName ? `(Responsable : ${d.responsibleName})` : ""} ${d.deadline ? `[Échéance : ${d.deadline}]` : ""}</li>`).join("") || "<li>Aucune décision explicite enregistrée</li>"}
      </ul>

      <h3 style="color: #0369a1; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">F. PLAN D'ACTIONS ISSU DE LA REUNION</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left;">
            <th style="padding: 6px; border: 1px solid #cbd5e1;">Action</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1;">Responsable</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1;">Échéance</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1;">Priorité</th>
          </tr>
        </thead>
        <tbody>
          ${actionItems.map((a) => `
            <tr>
              <td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>${a.title}</strong>${a.description ? `<br/><span style="color:#64748b;">${a.description}</span>` : ""}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">${a.responsibleName || "—"}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">${a.dueDate || "—"}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">${a.priority.toUpperCase()}</td>
            </tr>
          `).join("") || `<tr><td colSpan="4" style="padding: 8px; text-align: center; color: #64748b;">Aucune action enregistrée</td></tr>`}
        </tbody>
      </table>

      <div style="margin-top: 30px; border-t: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: right;">
        Procès-Verbal généré automatiquement par QHSE Duo Sénégal — Référence GED immuable.
      </div>
    </div>
  `;

  return { htmlContent, title: `PV — ${m.reference} — ${m.title}` };
}

export async function publishPVToGED(meetingId: string, customNotes?: string): Promise<ActionResult & { documentId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée" };

  if (customNotes) {
    await supabase.from("meetings").update({ notes: customNotes }).eq("id", meetingId);
  }

  const { htmlContent, title } = await generateDraftPV(meetingId);
  const fileName = `PV-${meetingId.substring(0, 8)}.html`;
  const storagePath = `pv/${Date.now()}-${fileName}`;

  // Deposer le contenu HTML dans le storage Supabase privatise
  const blob = new Blob([htmlContent], { type: "text/html" });
  const { error: uploadErr } = await supabase.storage.from("qhse-documents").upload(storagePath, blob, {
    contentType: "text/html",
    upsert: true,
  });

  if (uploadErr) return { error: `Échec du dépôt du PV dans la GED: ${uploadErr.message}` };

  // Création entrée GED Master Document
  const createDocRes = await createDocument({
    title,
    category: "rapport",
    documentType: "rapport",
    domaineQhse: "general",
    storagePath,
    originalFilename: fileName,
    fileType: "text/html",
    fileSize: htmlContent.length,
    originType: "interne",
  });

  if (createDocRes.error || !createDocRes.documentId) {
    return { error: createDocRes.error || "Impossible de rattacher le PV dans la GED." };
  }

  const docId = createDocRes.documentId;

  // Mise à jour du lien GED sur la réunion
  await supabase
    .from("meetings")
    .update({
      document_id: docId,
      status: "pv_a_valider",
      updated_at: new Date().toISOString(),
    })
    .eq("id", meetingId);

  revalidatePath("/reunions");
  revalidatePath(`/reunions/${meetingId}`);
  revalidatePath("/documents");
  return { error: null, documentId: docId };
}

// ----------------------------------------------------------------------------
// 6. EXTRACTION ET CONFIRMATION DES ACTIONS (HUMAN-IN-THE-LOOP MANDATORY)
// ----------------------------------------------------------------------------

export async function confirmAndCreateMeetingActions(
  meetingId: string,
  actionsToCreate: {
    title: string;
    description?: string;
    responsibleUserId?: string;
    responsibleName?: string;
    dueDate?: string;
    priority?: "faible" | "moyenne" | "elevee" | "critique";
    createAsCapa?: boolean;
  }[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée" };

  const { data: profile } = await supabase.from("profiles").select("company_id, full_name").eq("id", user.id).single();
  if (!profile?.company_id) return { error: "Profil introuvable" };

  for (const act of actionsToCreate) {
    let createdCapaId: string | null = null;

    if (act.createAsCapa) {
      const { data: capaData } = await supabase
        .from("actions_correctives")
        .insert({
          company_id: profile.company_id,
          description: `[Réunion] ${act.title}${act.description ? ` : ${act.description}` : ""}`,
          responsable_id: act.responsibleUserId || null,
          echeance: act.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: "a_faire",
          meeting_id: meetingId,
        })
        .select("id")
        .single();

      createdCapaId = capaData?.id || null;
    }

    await supabase.from("meeting_action_items").insert({
      meeting_id: meetingId,
      title: act.title,
      description: act.description || null,
      responsible_user_id: act.responsibleUserId || null,
      responsible_name: act.responsibleName || null,
      due_date: act.dueDate || null,
      priority: act.priority || "moyenne",
      status: "a_faire",
      action_id: createdCapaId,
    });
  }

  await supabase.from("meeting_history").insert({
    company_id: profile.company_id,
    meeting_id: meetingId,
    event_type: "action_confirmed",
    actor_id: user.id,
    actor_name: profile.full_name || "Utilisateur",
    details: { created_count: actionsToCreate.length },
  });

  revalidatePath(`/reunions/${meetingId}`);
  revalidatePath("/actions");
  return { error: null };
}

export async function addMeetingDecision(params: {
  meetingId: string;
  decisionText: string;
  responsibleUserId?: string;
  deadline?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("meeting_decisions").insert({
    meeting_id: params.meetingId,
    decision_text: params.decisionText,
    responsible_user_id: params.responsibleUserId || null,
    deadline: params.deadline || null,
  });

  if (error) return { error: `Impossible d'enregistrer la décision: ${error.message}` };

  revalidatePath(`/reunions/${params.meetingId}`);
  return { error: null };
}
