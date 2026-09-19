"use server";

import { createClient } from "@/lib/supabase/server";
import type { CopilotResponse, CopilotSource, CopilotResponseType } from "@/lib/types/copilot";
import { listMeetings, prepareMeetingSuggestions } from "@/lib/services/meetings.service";
import { listDocuments } from "@/lib/services/documents.service";
import {
  searchKnowledgeChunks,
  buildKnowledgeCitation,
  type KnowledgeSearchResult,
} from "@/lib/services/knowledge.service";

import {
  classifyCopilotIntent,
  handleMethodExplain,
  handleMethodApply,
} from "@/lib/services/copilot-methods.service";

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

export async function searchMeetingDecisions(): Promise<CopilotSource[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meeting_decisions")
    .select("id, decision_text, deadline, status, meeting:meetings(id, reference, title)")
    .neq("status", "cloturee")
    .order("created_at", { ascending: false })
    .limit(10);

  if (!data) return [];
  return data.map((d) => {
    const m = d.meeting as unknown as { id: string; reference: string; title: string } | null;
    return {
      id: d.id,
      module: "previous_meeting",
      title: `[Décision ${m?.reference || "Réunion"}] ${d.decision_text}`,
      reference: m?.reference,
      href: m?.id ? `/reunions/${m.id}` : "/reunions",
      badgeText: d.status || "Ouverte",
      badgeVariant: "secondary",
    };
  });
}

export async function searchAuditNonConformities(): Promise<CopilotSource[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_items")
    .select("id, title, requirement, status, audit:audits(id, title, reference_framework)")
    .eq("status", "non_conforme")
    .limit(10);

  if (!data) return [];
  return data.map((item) => {
    const auditInfo = item.audit as unknown as { id: string; title: string; reference_framework: string } | null;
    return {
      id: item.id,
      module: "audit",
      title: `[Audit Non-Conformité] ${item.title}`,
      reference: auditInfo?.reference_framework || "Audit",
      href: auditInfo?.id ? `/audits/${auditInfo.id}` : "/audits",
      badgeText: "Non conforme",
      badgeVariant: "destructive",
    };
  });
}

/**
 * Recherche dans la Base de Connaissances QHSE (Outil Server-Side R2)
 */
export async function searchKnowledgeBase(
  query: string,
  filters?: { method?: string }
): Promise<{ sources: CopilotSource[]; chunks: KnowledgeSearchResult[] }> {
  const results = await searchKnowledgeChunks({
    query,
    method: filters?.method,
    limit: 6,
  });

  const sources: CopilotSource[] = [];

  for (const item of results) {
    const cit = await buildKnowledgeCitation(item);
    sources.push({
      id: item.knowledge_chunk_id,
      module: "knowledge_base",
      title: cit.formattedCitation,
      reference: item.version ? `v${item.version}` : undefined,
      href: cit.href || "/parametres/knowledge",
      badgeText: cit.badgeText,
      badgeVariant: item.source_type === "outil_excel" || item.source_type === "tool_excel" ? "secondary" : "outline",
    });
  }

  return { sources, chunks: results };
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
  let methodAnalysis: any = undefined;

  // 1. Classification Métier & Intention (METHOD_EXPLAIN, METHOD_APPLY, KNOWLEDGE_SEARCH, OPERATIONAL_DATA)
  const { intent, method } = await classifyCopilotIntent(userQuery);

  if (intent === "METHOD_EXPLAIN" && method) {
    const explainRes = await handleMethodExplain(method, userQuery);
    responseType = explainRes.isMissingInfo ? "missing_info" : "method_explain";
    markdownContent = explainRes.markdownContent;
    sources.push(...explainRes.sources);
  } else if (intent === "METHOD_APPLY" && method) {
    const applyRes = await handleMethodApply(method, userQuery);
    responseType = "method_apply";
    markdownContent = applyRes.markdownContent;
    sources.push(...applyRes.sources);
    methodAnalysis = applyRes.methodAnalysis;
  } else if (queryLower.includes("sujet") || queryLower.includes("ordre du jour") || queryLower.includes("prochaine réunion")) {
    const suggestions = await prepareMeetingSuggestions();
    markdownContent = `### 📋 Données Entreprise : Proposition d'Ordre du Jour\n\nSur la base des données réelles de l'entreprise, voici les sujets critiques recommandés :\n\n`;

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
  } else if (queryLower.includes("décision") || queryLower.includes("decision")) {
    const decisions = await searchMeetingDecisions();
    sources.push(...decisions);

    markdownContent = `### 📌 Données Entreprise : Suivi des Décisions de Réunion\n\nVoici les **${decisions.length} décision(s) encore ouvertes** issues des dernières réunions QHSE :\n\n`;
    if (decisions.length === 0) {
      markdownContent += `*Aucune décision ouverte. Toutes les décisions antérieures ont été actées et clôturées.*\n`;
    } else {
      for (const d of decisions) {
        markdownContent += `- **${d.title}** (Statut : *${d.badgeText}*)\n`;
      }
    }
  } else if (queryLower.includes("audit") && (queryLower.includes("non-conform") || queryLower.includes("preuve") || queryLower.includes("écart"))) {
    const nonConformities = await searchAuditNonConformities();
    sources.push(...nonConformities);

    markdownContent = `### 🔍 Données Entreprise : Points d'Audit Non Conformes & Preuves Manquantes\n\nIl y a **${nonConformities.length} non-conformité(s) d'audit** répertoriée(s) :\n\n`;
    if (nonConformities.length === 0) {
      markdownContent += `*Aucune non-conformité d'audit en attente de preuve. Les rapports d'audit sont conformes.*\n`;
    } else {
      for (const nc of nonConformities) {
        markdownContent += `- **${nc.title}** (${nc.reference})\n`;
      }
    }
  } else if (queryLower.includes("capa") || queryLower.includes("retard") || queryLower.includes("action bloqu")) {
    const capas = await searchCAPA();
    sources.push(...capas);

    const blocked = capas.filter((c) => c.badgeText === "Bloquée");

    markdownContent = `### 🔴 Données Entreprise : État des Actions Correctives (CAPA)\n\nIl y a actuellement **${capas.length} action(s) CAPA** nécessitant une attention :\n\n`;
    for (const c of capas) {
      markdownContent += `- **${c.title}** (Statut : *${c.badgeText}*)\n`;
    }

    if (blocked.length > 0) {
      markdownContent += `\n⚠️ **${blocked.length} action(s) bloquée(s)** nécessitant un arbitrage en réunion de direction.`;
    }
  } else if (queryLower.includes("incident") && (queryLower.includes("critique") || queryLower.includes("déclaré") || queryLower.includes("récent"))) {
    const incidents = await searchIncidents();
    sources.push(...incidents);

    markdownContent = `### ⚠️ Données Entreprise : Analyse des Incidents Déclarés\n\n**${incidents.length} incident(s) récent(s)** identifié(s) dans le système :\n\n`;
    for (const inc of incidents) {
      markdownContent += `- **${inc.title}** (${inc.badgeText})\n`;
    }
  } else {
    // Intention Connaissances / Recherche Hybride
    const kbRes = await searchKnowledgeBase(userQuery);

    if (kbRes.chunks.length > 0) {
      sources.push(...kbRes.sources);
      markdownContent = `### 📚 Base de Connaissances QHSE (Connaissances Importées)\n\nVoici les éléments extraits et vérifiés dans votre base de connaissances :\n\n`;

      for (let i = 0; i < kbRes.chunks.length; i++) {
        const chunk = kbRes.chunks[i];
        const cit = await buildKnowledgeCitation(chunk);
        markdownContent += `#### ${i + 1}. ${cit.formattedCitation}\n`;
        if (chunk.detected_methods && chunk.detected_methods.length > 0) {
          markdownContent += `*Méthode(s) : ${chunk.detected_methods.join(", ")}*\n`;
        }
        markdownContent += `\`\`\`text\n${chunk.content}\n\`\`\`\n\n`;
      }
    } else {
      responseType = "missing_info";
      markdownContent = `### 📚 Base de Connaissances QHSE\n\n⚠️ **Information non trouvée dans la Base de Connaissances**\n\nAucune norme, cours, méthode ou matrice Excel correspondant à **"${userQuery}"** n'a été trouvé dans vos connaissances actuellement importées.\n\n> *Vous pouvez ajouter des ressources (cours, normes ISO, matrices AMDEC/Excel) dans le socle d'ingestion sous **Paramètres > Base de Connaissances** (/parametres/knowledge).*`;
    }
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
        operation_type: "ask_qhse_r2",
        sources_used: sources,
      });
    }
  }

  return {
    query: userQuery,
    responseType,
    markdownContent,
    sources,
    methodAnalysis,
    suggestedActions: [
      ...(methodAnalysis?.proposedActions && methodAnalysis.proposedActions.length > 0
        ? [
            {
              label: "Créer les actions proposées en CAPA",
              actionType: "create_capa_proposal" as const,
              payload: { proposedActions: methodAnalysis.proposedActions },
            },
          ]
        : []),
      { label: "Base de Connaissances", actionType: "open_href", targetHref: "/parametres/knowledge" },
      { label: "Préparer une Réunion", actionType: "add_to_agenda", targetHref: "/reunions" },
      { label: "Voir les CAPA", actionType: "open_href", targetHref: "/actions" },
      { label: "Voir la GED", actionType: "open_href", targetHref: "/documents" },
    ],
    timestamp: new Date().toISOString(),
    isConfigured,
  };
}
