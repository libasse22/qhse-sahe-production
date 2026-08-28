"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";
import type { WorkPermit, WorkPermitStatus, WorkPermitType, SafetyMeasure } from "@/lib/types/permits";

const PERMIT_SELECT =
  "*, applicant:profiles!work_permits_applicant_id_fkey(full_name), approver:profiles!work_permits_approver_id_fkey(full_name), site:sites(name), equipment:equipment(name)";

interface PermitRow {
  id: string;
  reference: string;
  permit_type: WorkPermitType;
  title: string;
  description: string;
  location: string;
  site_id?: string | null;
  equipment_id?: string | null;
  applicant_id: string;
  approver_id?: string | null;
  start_time: string;
  end_time: string;
  safety_measures: SafetyMeasure[];
  status: WorkPermitStatus;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  applicant?: { full_name: string } | null;
  approver?: { full_name: string } | null;
  site?: { name: string } | null;
  equipment?: { name: string } | null;
}

function toWorkPermit(row: PermitRow): WorkPermit {
  return {
    id: row.id,
    reference: row.reference,
    permitType: row.permit_type,
    title: row.title,
    description: row.description,
    location: row.location,
    siteId: row.site_id ?? null,
    siteName: row.site?.name ?? null,
    equipmentId: row.equipment_id ?? null,
    equipmentName: row.equipment?.name ?? null,
    applicantId: row.applicant_id,
    applicantName: row.applicant?.full_name ?? "—",
    approverId: row.approver_id ?? null,
    approverName: row.approver?.full_name ?? "—",
    startTime: row.start_time,
    endTime: row.end_time,
    safetyMeasures: row.safety_measures ?? [],
    status: row.status,
    rejectionReason: row.rejection_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listWorkPermits(): Promise<WorkPermit[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("work_permits")
    .select(PERMIT_SELECT)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as PermitRow[]).map(toWorkPermit);
}

export async function getWorkPermitById(id: string): Promise<WorkPermit | null> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("work_permits")
    .select(PERMIT_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return toWorkPermit(data as unknown as PermitRow);
}

export async function createWorkPermit(params: {
  title: string;
  permitType: WorkPermitType;
  description: string;
  location: string;
  siteId?: string;
  equipmentId?: string;
  startTime: string;
  endTime: string;
  safetyMeasures: SafetyMeasure[];
}): Promise<ActionResult & { permitId?: string }> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée. Reconnectez-vous." };

  const refYear = new Date().getFullYear();
  const refRandom = Math.floor(1000 + Math.random() * 9000);
  const reference = `PTW-${refYear}-${refRandom}`;

  const { data, error } = await supabase
    .from("work_permits")
    .insert({
      reference,
      permit_type: params.permitType,
      title: params.title,
      description: params.description,
      location: params.location,
      site_id: params.siteId || null,
      equipment_id: params.equipmentId || null,
      applicant_id: user.id,
      start_time: params.startTime,
      end_time: params.endTime,
      safety_measures: params.safetyMeasures,
      status: "en_attente",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Impossible de créer le permis de travail." };
  }

  revalidatePath("/permis-de-travail");
  revalidatePath("/dashboard");
  return { error: null, permitId: data.id };
}

export async function updateWorkPermitStatus(
  permitId: string,
  status: WorkPermitStatus,
  rejectionReason?: string,
): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const updateData: Record<string, any> = { status, updated_at: new Date().toISOString() };

  if (status === "approuve") {
    updateData.approver_id = user?.id;
  }
  if (rejectionReason) {
    updateData.rejection_reason = rejectionReason;
  }

  const { error } = await supabase
    .from("work_permits")
    .update(updateData)
    .eq("id", permitId);

  if (error) {
    return { error: "Impossible de mettre à jour le permis de travail." };
  }

  revalidatePath(`/permis-de-travail/${permitId}`);
  revalidatePath("/permis-de-travail");
  revalidatePath("/dashboard");
  return { error: null };
}
