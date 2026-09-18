"use server";

import { createClient } from "@/lib/supabase/server";
import type { CopilotResponse, CopilotSource, CopilotResponseType } from "@/lib/types/copilot";
import { getCockpitData } from "@/lib/services/cockpit.service";
import { listMeetings, prepareMeetingSuggestions } from "@/lib/services/meetings.service";
import { listDocuments } from "@/lib/services/documents.service";

// ----------------------------------------------------------------------------
// 1. OUTILS INTERNES DU COPILOTE (RLS & TENANT RESTRICTED)
// ----------------------------------------------------------------------------

export async function searchIncidents(queryStr?: string): Promise<CopilotSource[]> {
  const supabase = await createClient();
  let query = supabase
    .from("incidents")
    .select("id, code_reference, title, severity, status, occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(10);

  if (queryStr) {
    const q = `%${queryStr.trim()}%`;
    query = query.or(`title.ilike.${q},code_reference.ilike.${q},description.ilike.${q}`);
  }

  const { data } = await query;
  if (!data) return [];

  return data.map((inc) => ({
    id: inc.id,
    module: "incident",
    title: `[Incident ${inc.code_reference || ""}] ${inc.title}`,
    reference: inc.code_reference,
    href: `/incidents/${inc.id}`,
    badgeText: inc.severity === "critique" ? "Critique" : inc.status,
    badgeVariant: inc.severity === "critique" ? "destructive" : "secondary",
  }));
}

export async function searchCAPA(queryStr?: string): Promise<CopilotSource[]> {
  const supabase = await createClient();
  let query = supabase
    .from("actions_correctives")
    .select("id, code_reference, description, status, is_blocked, echeance")
    .order("echeance", { ascending: true })
    .limit(10);

  if (queryStr) {
    const q = `%${queryStr.trim()}%`;
    query = query.or(`description.ilike.${q},code_reference.ilike.${q}`);
  }

  const { data } = await query;
  if (!data) return [];

  return data.map((act) => ({
    id: act.id,
    module: "capa",
    title: `[CAPA ${act.code_reference || ""}] ${act.description}`,
    reference: act.code_reference,
    href: `/actions`,
    badgeText: act.is_blocked ? "Bloquée" : act.status,
    badgeVariant: act.is_blocked ? "destructive" : "warning",
  }));
}

export async function searchMeetings(queryStr?: string): Promise<CopilotSource[]> {
  const meetings = await listMeetings({ searchQuery: queryStr });
  return meetings.slice(0, 10).map((m) => ({
    id: m.id,
    module: "meeting",
    title: `[Réunion ${m.reference}] ${m.title}`,
    reference: m.reference,
    href: `/reunions/${m.id}`,
    badgeText: m.status,
    badgeVariant: m.status === "en_cours" ? "warning" : "outline",
  }));
}

export async function searchDocuments(queryStr?: string): Promise<CopilotSource[]> {
  const docs = await listDocuments({ searchQuery: queryStr });
  return docs.slice(0, 10).map((d) => ({
    id: d.id,
    module: "document",
    title: `[GED ${d.codeReference || ""}] ${d.title}`,
    reference: d.codeReference,
    href: `/documents/${d.id}`,
    badgeText: d.originType === "externe" ? "Externe" : "Interne",
    badgeVariant: d.originType === "externe" ? "secondary" : "outline",
  }));
}

export async function searchAudits(): Promise<CopilotSource[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("audits").select("id, title, reference_framework, status").limit(10);
  if (!data) return [];
  return data.map((a) => ({
    id: a.id,
    module: "audit",
    title: `[Audit] ${a.title}`,
    reference: a.reference_framework,
    href: `/audits/${a.id}`,
    badgeText: a.status,
    badgeVariant: "outline",
  }));
}

export async function searchWorkPermits(): Promise<CopilotSource[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("work_permits").select("id, permit_number, title, status").limit(10);
  if (!data) return [];
  return data.map((p) => ({
    id: p.id,
    module: "work_permit",
    title: `[PtW ${p.permit_number || ""}] ${p.title}`,
    reference: p.permit_number,
    href: `/permis-de-travail/${p.id}`,
    badgeText: p.status,
    badgeVariant: p.status === "suspended" ? "destructive" : "secondary",
  }));
}

// ----------------------------------------------------------------------------
// 2. MOTEUR SERVEUR ASK QHSE & PROVENANCE STRICTE
// ----------------------------------------------------------------------------

export async function askQhseCopilot(userQuery: string): Promise<CopilotResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const queryLower = userQuery.toLowerCase().trim();
  const sources: CopilotSource[] = [];

  // Verification Clé d'Environnement AI
  const apiKey = process.env.GEMINI_API_KEY || process.env.COPILOT_API_KEY;
  const isConfigured = Boolean(apiKey);

  let responseType: CopilotResponseType = "fact";
  let markdownContent = "";

  // 1. Détection d'Intention & Agrégation Déterministe Données Réelles
  if (queryLower.includes("sujet") || queryLower.includes("ordre du jour") || queryLower.includes("prochaine réunion")) {
    const suggestions = await prepareMeetingSuggestions();
    markdownContent = `### 📋 Proposition d'Ordre du Jour pour votre prochaine Réunion QHSE\n\nSur la base des données réelles de l'entreprise, voici les sujets critiques recommandés :\n\n`;

    if (suggestions.length === 0) {
      markdownContent += `*Aucun sujet critique à traiter immédiatement. Tous les indicateurs sont au vert.*\n`;
    } else {
      for (const item of suggestions) {
        markdownContent += `- **${item.title}** (${item.subtitle})\n`;
        sources.push({
          id: item.sourceId,
          module: item.sourceType,
          title: item.title,
          href: item.href,
          badgeText: item.badgeText,
          badgeVariant: item.badgeVariant,
        });
      }
    }

    markdownContent += `\n> **Statut :** **PROPOSITION**. Vous pouvez ajouter ces éléments directement à l'ordre du jour d'une réunion.`;
    responseType = "proposal";
  } else if (queryLower.includes("capa") || queryLower.includes("retard") || queryLower.includes("bloqu")) {
    const capas = await searchCAPA();
    sources.push(...capas);

    const blocked = capas.filter((c) => c.badgeText === "Bloquée");

    markdownContent = `### 🔴 État des Actions Correctives (CAPA)\n\nIl y a actuellement **${capas.length} action(s) CAPA** nécessitant une attention :\n\n`;
    for (const c of capas) {
      markdownContent += `- **${c.title}** (Statut : *${c.badgeText}*)\n`;
    }

    if (blocked.length > 0) {
      markdownContent += `\n⚠️ **${blocked.length} action(s) bloquée(s)** nécessitant un arbitrage en réunion de direction.`;
    }
  } else if (queryLower.includes("incident") || queryLower.includes("critique")) {
    const incidents = await searchIncidents();
    sources.push(...incidents);

    markdownContent = `### ⚠️ Analyse des Incidents Déclarés\n\n**${incidents.length} incident(s) récent(s)** identifié(s) dans le système :\n\n`;
    for (const inc of incidents) {
      markdownContent += `- **${inc.title}** (${inc.badgeText})\n`;
    }
  } else if (queryLower.includes("document") || queryLower.includes("vérifier") || queryLower.includes("ged")) {
    const docs = await searchDocuments();
    sources.push(...docs);

    markdownContent = `### 📁 Documents & Maîtrise Documentaire (ISO 7.5)\n\nDocuments enregistrés dans la GED entreprise :\n\n`;
    for (const d of docs) {
      markdownContent += `- **${d.title}** (Origine : *${d.badgeText}*)\n`;
    }
  } else {
    const cockpit = await getCockpitData();
    const capas = await searchCAPA();
    sources.push(...capas.slice(0, 3));

    markdownContent = `### 🛡️ Synthèse Opérationnelle QHSE\n\n- **Incidents enregistrés :** ${cockpit.stats.totalIncidents}\n- **Incidents en cours :** ${cockpit.stats.incidentsEnCours}\n- **Permis de Travail actifs :** ${cockpit.permitsKpi.actifs}\n- **Documents GED en révision :** ${cockpit.gedKpi.enRevision}\n\n*Posez une question spécifique pour analyser les réunions, les permis, les CAPA ou la GED.*`;
  }

  // Traçabilité Audit Log Append-Only
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("company_id, full_name").eq("id", user.id).single();
    if (profile?.company_id) {
      await supabase.from("copilot_audit_logs").insert({
        company_id: profile.company_id,
        user_id: user.id,
        user_name: profile.full_name || "Utilisateur",
        query_text: userQuery,
        operation_type: "ask_qhse",
        sources_used: sources,
      });
    }
  }

  return {
    query: userQuery,
    responseType,
    markdownContent,
    sources,
    suggestedActions: [
      { label: "Préparer une Réunion", actionType: "add_to_agenda", targetHref: "/reunions" },
      { label: "Voir les CAPA", actionType: "open_href", targetHref: "/actions" },
      { label: "Voir le Registre GED", actionType: "open_href", targetHref: "/documents/registre" },
    ],
    timestamp: new Date().toISOString(),
    isConfigured,
  };
}
