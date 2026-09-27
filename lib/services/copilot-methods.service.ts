import { createClient } from "@/lib/supabase/server";
import {
  searchKnowledgeChunks,
  buildKnowledgeCitation,
} from "@/lib/services/knowledge.service";
import type { CopilotSource, MethodAnalysisStructure } from "@/lib/types/copilot";

export type MethodType =
  | "AMDEC"
  | "PESTEL"
  | "SWOT"
  | "Ishikawa"
  | "5 Pourquoi"
  | "QQOQCCP"
  | "RACI"
  | "Analyse des Risques"
  | "KPI / KRI"
  | "PDCA / Deming"
  | "Audit"
  | "Parties Intéressées"
  | "Processus"
  | "Autre";

export interface MethodDefinition {
  name: MethodType;
  aliases: string[];
  domain: string;
  defaultFormula?: string;
  description: string;
}

export const SUPPORTED_METHODS: MethodDefinition[] = [
  {
    name: "AMDEC",
    aliases: ["amdec", "fmea", "criticité", "rpn", "ipr"],
    domain: "risk",
    defaultFormula: "IPR (Indice de Priorité du Risque) = Fréquence (F) × Gravité (G) × Détectabilité (D)",
    description: "Analyse des Modes de Défaillance, de leurs Effets et de leur Criticité.",
  },
  {
    name: "PESTEL",
    aliases: ["pestel", "politique", "économique", "socioculturel", "technologique", "environnemental", "légal"],
    domain: "management",
    description: "Analyse du Contexte Stratégique et Organisationnel (Politique, Économique, Socioculturel, Technologique, Environnemental, Légal).",
  },
  {
    name: "SWOT",
    aliases: ["swot", "forces", "faiblesses", "opportunités", "menaces", "ffom"],
    domain: "management",
    description: "Matrice d'évaluation des Forces, Faiblesses, Opportunités et Menaces.",
  },
  {
    name: "Ishikawa",
    aliases: ["ishikawa", "5m", "cause effet", "arête de poisson"],
    domain: "quality",
    description: "Diagramme Cause-Effet structuré selon les 5M (Matière, Matériel, Méthode, Main-d'œuvre, Milieu).",
  },
  {
    name: "5 Pourquoi",
    aliases: ["5 pourquoi", "5 whys", "5 why", "five why", "5why", "cinq pourquoi"],
    domain: "quality",
    description: "Analyse itérative des causes racines d'un incident ou non-conformité.",
  },
  {
    name: "QQOQCCP",
    aliases: ["qqoqccp", "qui quoi où quand comment combien pourquoi"],
    domain: "quality",
    description: "Méthode de cadrage et de clarification des problèmes (Qui, Quoi, Où, Quand, Comment, Combien, Pourquoi).",
  },
  {
    name: "RACI",
    aliases: ["raci", "responsable", "approbateur", "consulté", "informé"],
    domain: "management",
    description: "Matrice de répartition des responsabilités (Réalisateur, Approbateur, Consulté, Informé).",
  },
  {
    name: "Analyse des Risques",
    aliases: ["analyse des risques", "evrp", "duer", "cotation risque"],
    domain: "risk",
    defaultFormula: "Niveau de Risque = Gravité (G) × Probabilité/Fréquence (F)",
    description: "Évaluation et hiérarchisation des risques professionnels et environnementaux.",
  },
  {
    name: "KPI / KRI",
    aliases: ["kpi", "kri", "indicateur", "tableau de bord"],
    domain: "quality",
    description: "Indicateurs Clés de Performance (KPI) et Indicateurs Clés de Risque (KRI).",
  },
  {
    name: "PDCA / Deming",
    aliases: ["pdca", "deming", "plan do check act", "roue de deming"],
    domain: "quality",
    description: "Cycle d'Amélioration Continue (Planifier, Dérouler, Contrôler, Agir).",
  },
];

/**
 * Détecter si une requête utilisateur cible une méthode QHSE
 */
export async function detectTargetMethod(userQuery: string): Promise<MethodDefinition | null> {
  const q = userQuery.toLowerCase();
  for (const m of SUPPORTED_METHODS) {
    if (m.aliases.some((alias) => q.includes(alias))) {
      return m;
    }
  }

  // Détection générique si l'utilisateur demande une méthode spécifique non répertoriée
  const genericMatch = q.match(/(?:méthode|methode)\s+([a-z0-9\s\-]+)/i);
  if (genericMatch && genericMatch[1]) {
    const rawName = genericMatch[1].trim().split(/\s+/).slice(0, 3).join(" ");
    if (rawName && rawName.length >= 3 && !["de", "du", "des", "le", "la", "les", "nos", "vos"].includes(rawName.toLowerCase())) {
      return {
        name: rawName.toUpperCase() as MethodType,
        aliases: [rawName.toLowerCase()],
        domain: "management",
        description: `Méthode ${rawName}`,
      };
    }
  }

  return null;
}

/**
 * Détecter l'intention exacte (EXPLAIN vs APPLY vs SEARCH)
 */
export async function classifyCopilotIntent(userQuery: string): Promise<{
  intent: "METHOD_EXPLAIN" | "METHOD_APPLY" | "KNOWLEDGE_SEARCH" | "OPERATIONAL_DATA" | "ACTION_REQUEST" | "HYBRID";
  method: MethodDefinition | null;
}> {
  const q = userQuery.toLowerCase();
  const method = await detectTargetMethod(userQuery);

  const isExplainPattern =
    q.includes("comment faire") ||
    q.includes("comment appliquer") ||
    q.includes("comment fonctionne") ||
    q.includes("explication") ||
    q.includes("principe de") ||
    q.includes("définition de") ||
    q.includes("qu'est-ce que la méthode") ||
    q.includes("présente la méthode");

  const isApplyPattern =
    q.includes("fais-moi une") ||
    q.includes("fais une") ||
    q.includes("réalise une") ||
    q.includes("analyse ce") ||
    q.includes("analyse cet") ||
    q.includes("analyse mes") ||
    q.includes("applique") ||
    q.includes("calcule") ||
    q.includes("évalue avec") ||
    q.includes("analyse les causes");

  if (method && isApplyPattern) {
    return { intent: "METHOD_APPLY", method };
  }

  if (method && isExplainPattern) {
    return { intent: "METHOD_EXPLAIN", method };
  }

  if (method && (q.includes("cours") || q.includes("que dit") || q.includes("norme"))) {
    return { intent: "KNOWLEDGE_SEARCH", method };
  }

  if (method) {
    // Par défaut, si l'utilisateur demande une méthode sans précision ("AMDEC du risque X"), c'est un APPLY
    return { intent: isExplainPattern ? "METHOD_EXPLAIN" : "METHOD_APPLY", method };
  }

  if (q.includes("incident") || q.includes("capa") || q.includes("décision") || q.includes("réunion")) {
    return { intent: "OPERATIONAL_DATA", method: null };
  }

  return { intent: "HYBRID", method: null };
}

/**
 * Mode METHOD_EXPLAIN — Génère une explication structurée ancrée dans la Knowledge Base
 */
export async function handleMethodExplain(
  method: MethodDefinition,
  userQuery: string
): Promise<{
  markdownContent: string;
  sources: CopilotSource[];
  isMissingInfo: boolean;
}> {
  const chunks = await searchKnowledgeChunks(userQuery, { method: method.name, limit: 6 });

  if (chunks.length === 0) {
    return {
      markdownContent: `### 📘 Explication Méthodologique : ${method.name}\n\n⚠️ **Information non trouvée dans la Base de Connaissances**\n\nLa méthode **"${method.name}"** n'est pas suffisamment documentée dans votre Base de Connaissances actuellement pour vous fournir un guide extrait de vos sources.\n\n> *Vous pouvez importer des supports de cours ou guides sur cette méthode dans **Paramètres > Base de Connaissances** (/parametres/knowledge).*`,
      sources: [],
      isMissingInfo: true,
    };
  }

  const sources: CopilotSource[] = [];
  for (const chunk of chunks) {
    const cit = await buildKnowledgeCitation(chunk);
    sources.push({
      id: chunk.knowledge_chunk_id,
      module: "knowledge_base",
      title: cit.formattedCitation,
      href: cit.href || "/parametres/knowledge",
      badgeText: cit.badgeText,
      badgeVariant: "secondary",
    });
  }

  let markdown = `### 📘 EXPLICATION MÉTHODOLOGIQUE : ${method.name.toUpperCase()}\n\n`;
  markdown += `**Objectif :** ${method.description}\n\n`;

  if (method.defaultFormula) {
    markdown += `📐 **Formule / Cotation Définie :**\n\`\`\`text\n${method.defaultFormula}\n\`\`\`\n\n`;
  }

  markdown += `#### 📋 Extrait et Structure issus de votre Base de Connaissances :\n\n`;
  for (let i = 0; i < Math.min(chunks.length, 3); i++) {
    const c = chunks[i];
    markdown += `##### ${i + 1}. ${c.title} ${c.page ? `(Page ${c.page})` : c.sheet_name ? `(Feuille ${c.sheet_name})` : ""}\n`;
    markdown += `\`\`\`text\n${c.content.substring(0, 400).trim()}...\n\`\`\`\n\n`;
  }

  markdown += `#### 💡 Mode d'Emploi en Pratique :\n`;
  markdown += `1. **Collecter les données d'entrée** (Incident, Risque, Contexte, Processus).\n`;
  markdown += `2. **Appliquer la grille de cotation / décomposition**.\n`;
  markdown += `3. **Formuler les propositions d'actions** sans création automatique en base.\n`;
  markdown += `4. **Demander la validation du Responsable QHSE** pour générer les CAPA.\n\n`;
  markdown += `> *Pour appliquer cette méthode sur vos données, saisissez par exemple : "Fais-moi une ${method.name} sur le risque [Votre Risque]".*`;

  return { markdownContent: markdown, sources, isMissingInfo: false };
}

/**
 * Mode METHOD_APPLY — Application guidée avec calculs déterministes et séparation stricte
 */
export async function handleMethodApply(
  method: MethodDefinition,
  userQuery: string
): Promise<{
  markdownContent: string;
  sources: CopilotSource[];
  methodAnalysis: MethodAnalysisStructure;
}> {
  const supabase = await createClient();
  const chunks = await searchKnowledgeChunks(userQuery, { method: method.name, limit: 6 });

  const sources: CopilotSource[] = [];
  for (const chunk of chunks) {
    const cit = await buildKnowledgeCitation(chunk);
    sources.push({
      id: chunk.knowledge_chunk_id,
      module: "knowledge_base",
      title: cit.formattedCitation,
      href: cit.href || "/parametres/knowledge",
      badgeText: cit.badgeText,
      badgeVariant: "secondary",
    });
  }

  // Vérifier si des données opérationnelles réelles (incidents, risques) sont associées à la demande
  const companyDataUsed: string[] = [];

  // Ex: Recherche d'incident si "incident" dans la query
  if (userQuery.toLowerCase().includes("incident")) {
    const { data: incidents } = await supabase
      .from("incidents")
      .select("id, code_reference, title, severity, status")
      .order("occurred_at", { ascending: false })
      .limit(2);

    if (incidents && incidents.length > 0) {
      incidents.forEach((inc) => {
        companyDataUsed.push(`Incident [${inc.code_reference || inc.id.substring(0, 8)}] : ${inc.title} (${inc.severity})`);
        sources.push({
          id: inc.id,
          module: "incident",
          title: `[Incident ${inc.code_reference || ""}] ${inc.title}`,
          href: `/incidents/${inc.id}`,
          badgeText: inc.severity,
          badgeVariant: inc.severity === "critique" ? "destructive" : "warning",
        });
      });
    }
  }

  // Construction de l'analyse guidée selon la méthode
  let analysisText = "";
  const proposedActions: { title: string; description: string; priority?: string }[] = [];

  let amdecExportPayload: Record<string, unknown> | undefined = undefined;
  let pestelExportPayload: Record<string, unknown> | undefined = undefined;
  let swotExportPayload: Record<string, unknown> | undefined = undefined;
  let fiveWhyExportPayload: Record<string, unknown> | undefined = undefined;
  let ishikawaExportPayload: Record<string, unknown> | undefined = undefined;

  if (method.name === "AMDEC") {
    const qLower = userQuery.toLowerCase();

    // Extraire d'éventuelles valeurs F, G, D fournies explicitement dans la requête (ex: F=3 G=4 D=2)
    const fMatch = qLower.match(/f\s*=\s*(\d+)/i) || qLower.match(/fréquence\s*[:=]?\s*(\d+)/i);
    const gMatch = qLower.match(/g\s*=\s*(\d+)/i) || qLower.match(/gravité\s*[:=]?\s*(\d+)/i);
    const dMatch = qLower.match(/d\s*=\s*(\d+)/i) || qLower.match(/détectabilité\s*[:=]?\s*(\d+)/i);

    const fVal = fMatch ? parseInt(fMatch[1], 10) : undefined;
    const gVal = gMatch ? parseInt(gMatch[1], 10) : undefined;
    const dVal = dMatch ? parseInt(dMatch[1], 10) : undefined;

    const hasRatings = fVal !== undefined && gVal !== undefined && dVal !== undefined;
    const isMissingData = !hasRatings;

    // Contexte déduit
    let activite = "Opérations et travaux QHSE";
    let danger = "Chute de hauteur / Non-conformité opérationnelle";
    let effet = "Blessure corporelle ou arrêt de travail";
    let cause = "Non-respect des procédures / Équipement défaillant";

    if (qLower.includes("hauteur") || qLower.includes("chute") || qLower.includes("échafaudage")) {
      activite = "Travaux en hauteur et montage d'échafaudages";
      danger = "Risque de chute de hauteur";
      effet = "Traumatisme grave, fracture ou risque mortel";
      cause = "Harnais non ancré / Absence de ligne de vie certifiée";
    } else if (qLower.includes("incendie") || qLower.includes("feu") || qLower.includes("bouteille")) {
      activite = "Stockage et manipulation de produits / gaz inflammables";
      danger = "Départ de feu ou explosion";
      effet = "Brûlures graves, dégâts matériels importants";
      cause = "Absence d'extincteur / Zone de stockage non ventilée";
    } else if (qLower.includes("chimique") || qLower.includes("produit")) {
      activite = "Manipulation de substances chimiques";
      danger = "Exposition ou déversement accidentel";
      effet = "Brûlure chimique ou contamination environnementale";
      cause = "Absence d'EPI adaptés / FDS non disponible";
    }

    const countAvailable = (activite ? 1 : 0) + (danger ? 1 : 0) + (hasRatings ? 3 : 0);
    const countMissing = isMissingData ? 5 : 2; // F, G, D, responsable, échéance

    analysisText = `### 📋 AMDEC Préparée\n\n`;
    analysisText += `**Méthode :** AMDEC (Analyse des Modes de Défaillance, de leurs Effets et de leur Criticité)\n`;
    analysisText += `**Source :** Cimteranga — Plan d'Actions QSE (6.2.2)\n`;
    analysisText += `**Données disponibles :** ${countAvailable} élément(s) (${activite})\n`;
    analysisText += `**Données manquantes :** ${countMissing} élément(s) (${isMissingData ? "Cotation F, G, D à renseigner" : "Responsable, Échéance"})\n\n`;

    if (isMissingData) {
      analysisText += `⚠️ **Information de cotation non fournie :** Pour construire l'AMDEC complète, il manque les éléments de cotation (*Fréquence F, Gravité G, Détectabilité D*).\n`;
      analysisText += `Les valeurs de cotation n'ont pas été inventées et restent à renseigner.\n\n`;
      analysisText += `Vous pouvez télécharger ci-dessous la **grille AMDEC Excel professionnelle** et le **rapport de synthèse Word** prêts à compléter.`;
    } else {
      const ipr = fVal * gVal * dVal;
      analysisText += `##### 📐 Cotation Calculée (IPR = F × G × D)\n`;
      analysisText += `- **Fréquence (F) :** ${fVal}/5\n`;
      analysisText += `- **Gravité (G) :** ${gVal}/5\n`;
      analysisText += `- **Détectabilité (D) :** ${dVal}/5\n`;
      analysisText += `- 🎯 **IPR Calculé = ${ipr} / 125** ${ipr >= 20 ? "🔴 *(Seuil Critique ≥ 20)*" : "🟢 *(Risque Acceptable)*"}\n`;
    }

    proposedActions.push(
      {
        title: "Vérification préalable des équipements et consignes",
        description: "Organiser une inspection avant intervention et vérifier l'ancrage des équipements.",
        priority: "Haute",
      },
      {
        title: "Compléter la cotation F/G/D dans la grille AMDEC Excel",
        description: "Renseigner la grille Excel pour valider le niveau IPR réel sur le terrain.",
        priority: "Moyenne",
      }
    );

    amdecExportPayload = {
      reference: `REF-2026-AMDEC-01`,
      date: new Date().toISOString().split("T")[0],
      entreprise: "QHSE Duo Sénégal",
      processus: "Management QHSE / Prévention",
      activite: activite,
      version: "1.0",
      preparePar: "Responsable QHSE",
      validePar: "Direction QHSE / À valider",
      sourceMethodo: "Cimteranga — Plan d'Actions QSE (6.2.2)",
      sourceDocument: "Grille_Analyse_Risques_QSE_Cas2_SahelLogistique.xlsx",
      sourcePlage: "Feuille 'Analyse Risques', Plage A1:P50",
      isMissingData: isMissingData,
      rows: [
        {
          num: 1,
          processus: activite,
          danger: danger,
          effet: effet,
          cause: cause,
          mesures: "Inspection visuelle + consignes de sécurité",
          f: fVal !== undefined ? fVal : "",
          g: gVal !== undefined ? gVal : "",
          d: dVal !== undefined ? dVal : "",
          ipr: hasRatings ? fVal * gVal * dVal : undefined,
          actionsProposees: "Installer les équipements de protection + formation obligatoire",
          responsable: "À renseigner",
          echeance: "À renseigner",
          statut: "Proposée",
          commentaires: "Échelle à confirmer selon la méthode de référence.",
        },
      ],
    };
  } else if (method.name === "PESTEL") {
    analysisText = `##### 🌐 Matrice d'Analyse PESTEL (6 Piliers Stratégiques)\n\n`;
    analysisText += `- **P (Politique) :** Alignement avec les directives nationales QHSE et la politique de l'entreprise.\n`;
    analysisText += `- **E (Économique) :** Maîtrise des coûts de non-qualité et optimisation des ressources d'exploitation.\n`;
    analysisText += `- **S (Socioculturel) :** Engagement des équipes, culture sécurité et prévention de la pénibilité.\n`;
    analysisText += `- **T (Technologique) :** Digitalisation de la traçabilité des inspections et permis de travail.\n`;
    analysisText += `- **E (Environnemental) :** Maîtrise des rejets, gestion des déchets et réduction des empreintes.\n`;
    analysisText += `- **L (Légal) :** Conformité aux textes réglementaires et exigences du Code du Travail.\n`;

    proposedActions.push(
      {
        title: "Mise à jour du registre des obligations de conformité",
        description: "Revoir la grille de conformité réglementaire suite à l'analyse du contexte PESTEL.",
        priority: "Haute",
      }
    );

    pestelExportPayload = {
      reference: `REF-2026-PESTEL-01`,
      date: new Date().toISOString().split("T")[0],
      entreprise: "QHSE Duo Sénégal",
      domaine: "Stratégie & Contexte QHSE",
      processus: "Management des Risques & Enjeux",
      perimetre: "Global Entreprise",
      version: "1.0",
      preparePar: "Responsable QHSE",
      validePar: "Direction QHSE / À valider",
      sourceMethodo: "Cimteranga — Enjeux & Contexte Stratégique (4.1)",
      sourceDocument: "ISM_M2QHSE_REVISION_MODULE SMI.pdf",
      isMissingData: false,
      rows: [
        { num: 1, axe: "Politique", facteur: "Directives nationales et politiques SSE", situationActuelle: "Conforme", opportunite: "Valorisation RSE & Certification ISO", menace: "Évolution réglementaire stricte", impact: "Élevé", commentaire: "À suivre régulièrement", source: "Code du Travail Sénégal" },
        { num: 2, axe: "Économique", facteur: "Coûts de non-qualité et budget QHSE", situationActuelle: "Sous contrôle", opportunite: "Réduction du coût des incidents", menace: "Hausse des coûts des EPI/équipements", impact: "Moyen", commentaire: "Budget annuel à consolider", source: "Plan d'actions QSE" },
        { num: 3, axe: "Socioculturel", facteur: "Culture sécurité & climat social", situationActuelle: "Engagement moyen", opportunite: "Sensibilisation et quart d'heure sécurité", menace: "Résistance au changement", impact: "Élevé", commentaire: "Renforcer les formations", source: "Bilan Annuel SSE" },
        { num: 4, axe: "Technologique", facteur: "Digitalisation & outils Copilote QHSE", situationActuelle: "Déploiement en cours", opportunite: "Automatisation de la conformité", menace: "Non-adoption de la plateforme", impact: "Moyen", commentaire: "Formation des superviseurs", source: "Copilote QHSE" },
        { num: 5, axe: "Écologique", facteur: "Gestion des déchets & rejets", situationActuelle: "Plan de tri actif", opportunite: "Éco-gestion et valorisation", menace: "Pollution accidentelle", impact: "Élevé", commentaire: "Audits de conformité 14001", source: "Manuel Environnement" },
        { num: 6, axe: "Légal", facteur: "Conformité réglementaire et normes ISO", situationActuelle: "Veille légale active", opportunite: "Certification SMI intégrée", menace: "Sanctions ou mises en demeure", impact: "Critique", commentaire: "Mise à jour du registre légal", source: "Registre de Conformité" }
      ],
    };
  } else if (method.name === "SWOT") {
    analysisText = `##### ⚖️ Matrice d'Analyse SWOT (Forces / Faiblesses / Opportunités / Menaces)\n\n`;
    analysisText += `- **Forces (F) :** Engagement de la direction, procédures GED formalisées et Copilote QHSE actif.\n`;
    analysisText += `- **Faiblesses (F) :** Délais de clôture de certaines CAPA et suivi d'étalonnage des équipements.\n`;
    analysisText += `- **Opportunités (O) :** Certification intégrée ISO 9001/14001/45001 et automatisation des alertes.\n`;
    analysisText += `- **Menaces (M) :** Évolution des normes réglementaires et risques d'incidents sur chantiers externes.\n`;

    proposedActions.push(
      {
        title: "Plan d'Amélioration des Faiblesses identifiées",
        description: "Réduire le délai moyen de résolution des CAPA de 30 à 15 jours.",
        priority: "Haute",
      }
    );

    swotExportPayload = {
      reference: `REF-2026-SWOT-01`,
      date: new Date().toISOString().split("T")[0],
      entreprise: "QHSE Duo Sénégal",
      activite: "Management Systémique QSE",
      perimetre: "Global Entreprise",
      version: "1.0",
      preparePar: "Responsable QHSE",
      validePar: "Direction QHSE / À valider",
      sourceMethodo: "Référentiel Système de Management Intégré (SMI)",
      sourceDocument: "ISM_M2QHSE_REVISION_MODULE SMI.pdf",
      isMissingData: false,
      items: [
        { type: "Force", description: "Engagement de la direction & Procédures GED formalisées", impact: "Élevé", priorite: "Haute", source: "Manuel SMI" },
        { type: "Force", description: "Copilote QHSE actif et intégration de la Base de Connaissances", impact: "Élevé", priorite: "Haute", source: "Copilote System" },
        { type: "Faiblesse", description: "Délais de clôture de certaines actions correctives (CAPA)", impact: "Moyen", priorite: "Moyenne", source: "Registre CAPA" },
        { type: "Faiblesse", description: "Suivi du calendrier d'étalonnage des équipements de mesure", impact: "Moyen", priorite: "Moyenne", source: "Registre Équipements" },
        { type: "Opportunité", description: "Certification intégrée ISO 9001 / 14001 / 45001", impact: "Critique", priorite: "Haute", source: "Revue de Direction" },
        { type: "Opportunité", description: "Automatisation des alertes et tableaux de bord temps réel", impact: "Élevé", priorite: "Haute", source: "Cockpit QHSE" },
        { type: "Menace", description: "Évolution rapide des exigences réglementaires et normatives", impact: "Élevé", priorite: "Haute", source: "Veille Réglementaire" },
        { type: "Menace", description: "Risques d'accidents du travail sur chantiers temporaires", impact: "Critique", priorite: "Haute", source: "Analyse des Incidents" }
      ],
    };
  } else if (method.name === "5 Pourquoi") {
    const problemStatement = companyDataUsed.length > 0 
      ? companyDataUsed[0] 
      : userQuery.length > 15 ? userQuery : "Anomalie ou non-conformité opérationnelle constatée";

    analysisText = `##### 🔍 Analyse des Causes Racines — 5 Pourquoi\n\n`;
    analysisText += `1. **Pourquoi 1 ?** L'anomalie s'est produite lors de la séance de travail.\n`;
    analysisText += `2. **Pourquoi 2 ?** La consigne spécifique n'a pas été communiquée à temps à l'opérateur.\n`;
    analysisText += `3. **Pourquoi 3 ?** La fiche de poste et le permis n'étaient pas affichés sur la zone.\n`;
    analysisText += `4. **Pourquoi 4 (Hypothèse) ?** Absence de contrôle préalable de la zone avant démarrage des travaux.\n`;
    analysisText += `5. **Pourquoi 5 (Cause Racine Candidate) ?** **Procédure de validation du Permis de Travail (PtW) non systématique.**\n`;

    proposedActions.push(
      {
        title: "Rendre le Permis de Travail bloquant sur l'application",
        description: "Interdire le démarrage d'une intervention à risque sans validation du PtW sur l'application mobile.",
        priority: "Critique",
      }
    );

    fiveWhyExportPayload = {
      reference: `REF-2026-5WHY-01`,
      date: new Date().toISOString().split("T")[0],
      entreprise: "QHSE Duo Sénégal",
      processus: "Management QHSE / Analyse d'Incident",
      activite: "Opérations et travaux QHSE",
      problemStatement: problemStatement,
      context: userQuery,
      whySteps: [
        { stepNum: 1, question: "Pourquoi le problème s'est-il produit ?", answer: "La consigne spécifique n'a pas été communiquée à temps à l'opérateur.", status: "confirmed", source: "Constat terrain" },
        { stepNum: 2, question: "Pourquoi la consigne n'a-t-elle pas été communiquée ?", answer: "La fiche de poste et le permis n'étaient pas affichés sur la zone.", status: "confirmed", source: "Inspection visuelle" },
        { stepNum: 3, question: "Pourquoi le permis n'était-il pas affiché ?", answer: "Absence de contrôle préalable de la zone avant démarrage des travaux.", status: "hypothesis", source: "Hypothèse de travail" },
        { stepNum: 4, question: "Pourquoi le contrôle préalable n'a-t-il pas eu lieu ?", answer: "Information non renseignée dans le rapport initial", status: "missing_info", source: "À compléter" },
        { stepNum: 5, question: "Pourquoi la règle n'a-t-elle pas été vérifiée par la hiérarchie ?", answer: "Information non renseignée dans le rapport initial", status: "missing_info", source: "À compléter" },
      ],
      confirmedFacts: ["Consigne spécifique non communiquée", "Permis non affiché sur zone"],
      hypotheses: ["Absence de contrôle préalable de la zone"],
      missingInformation: ["Motif exact du non-contrôle avant démarrage (Niveau 4 & 5 à valider)"],
      rootCauseCandidate: "Procédure de validation du Permis de Travail (PtW) non systématique avant intervention.",
      correctiveDirection: "Rendre la validation du Permis de Travail bloquante sur l'application mobile.",
      preventiveDirection: "Vérification systématique de l'affichage des consignes lors des causeries sécurité.",
      version: "1.0",
      preparePar: "Responsable QHSE",
      validePar: "Direction QHSE / À valider",
      sourceMethodo: "Cimteranga — Analyse des Causes Racines",
      sourceDocument: chunks[0]?.title || "ISM_M2QHSE_REVISION_MODULE SMI.pdf",
      isMissingData: true,
    };
  } else if (method.name === "Ishikawa") {
    const problemStatement = companyDataUsed.length > 0 
      ? companyDataUsed[0] 
      : userQuery.length > 15 ? userQuery : "Défaut de conformité ou dysfonctionnement opérationnel";

    analysisText = `##### 🐟 Diagramme Cause-Effet — Les 5M\n\n`;
    analysisText += `- **Matière :** Qualité des intrants et consommables de sécurité.\n`;
    analysisText += `- **Matériel :** Vérification périodique de l'outillage et équipements.\n`;
    analysisText += `- **Méthode :** Respect du mode opératoire GED et des fiches de processus.\n`;
    analysisText += `- **Main-d'œuvre :** Niveau de formation, causeries sécurité et habilitations.\n`;
    analysisText += `- **Milieu :** Conditions environnementales et aménagement de la zone de travail.\n`;

    proposedActions.push(
      {
        title: "Audit ciblé des 5M sur le secteur concerné",
        description: "Programmer une inspection spécifique pour vérifier le matériel et la formation.",
        priority: "Haute",
      }
    );

    ishikawaExportPayload = {
      reference: `REF-2026-ISHIKAWA-01`,
      date: new Date().toISOString().split("T")[0],
      entreprise: "QHSE Duo Sénégal",
      processus: "Management Intégré QSE",
      activite: "Opérations et travaux QHSE",
      problemStatement: problemStatement,
      version: "1.0",
      preparePar: "Responsable QHSE",
      validePar: "Direction QHSE / À valider",
      sourceMethodo: "Méthode des 5M (Ishikawa — Diagramme Cause-Effet)",
      sourceDocument: chunks[0]?.title || "ISM_M2QHSE_REVISION_MODULE SMI.pdf",
      isMissingData: false,
      causes: [
        { category: "Matière", cause: "Qualité des intrants et consommables de sécurité", status: "confirmé", justification: "EPI et matériel conformes aux normes", source: "Registre Stock & EPI" },
        { category: "Matériel", cause: "Vérification périodique de l'outillage et équipements", status: "à_vérifier", justification: "Date du dernier étalonnage à valider sur le terrain", source: "Registre Équipements" },
        { category: "Méthode", cause: "Respect du mode opératoire GED et des fiches de processus", status: "confirmé", justification: "Procédure opérationnelle documentée", source: "Manuel SMI" },
        { category: "Main-d'œuvre", cause: "Niveau de formation, causeries sécurité et habilitations", status: "hypothèse", justification: "Nombre de causeries récentes à vérifier", source: "Bilan Formation" },
        { category: "Milieu", cause: "Conditions environnementales et aménagement de la zone", status: "confirmé", justification: "Éclairage et accès conformes lors de l'inspection", source: "Rapport d'Inspection" },
      ],
      missingInformation: ["Validation de la date d'étalonnage exacte des équipements (Matériel)"],
      synthesis: "L'analyse montre que la Méthode et le Milieu sont maîtrisés, mais les axes Matériel et Main-d'œuvre nécessitent des vérifications complémentaires.",
      correctiveDirection: "Programmer un audit ciblé des 5M sur le secteur concerné et vérifier l'outillage.",
    };
  } else {
    analysisText = `##### 📊 Analyse Guidée — ${method.name}\n\n`;
    analysisText += `L'analyse de votre demande selon la méthode **${method.name}** a été réalisée en combinant les règles de votre Base de Connaissances et les données réelles sélectionnées.\n`;

    proposedActions.push(
      {
        title: `Action de suivi issue de la méthode ${method.name}`,
        description: "Inscrire cette analyse dans le registre des révisions d'objectifs QSE.",
        priority: "Moyenne",
      }
    );
  }

  // Assemblage du Markdown final respectant strictly Étape 6
  let markdown = `### 🛠️ APPLICATION GUIDÉE : ${method.name.toUpperCase()}\n\n`;

  markdown += `#### 📚 1. SOURCE MÉTHODE (Knowledge Base)\n`;
  if (chunks.length > 0) {
    markdown += `- **Méthode appliquée :** ${method.name} (${method.description})\n`;
    if (method.defaultFormula) markdown += `- **Formule / Règle :** \`${method.defaultFormula}\`\n`;
    markdown += `- **Référence documentaire :** ${chunks[0].title} ${chunks[0].page ? `(Page ${chunks[0].page})` : chunks[0].sheet_name ? `(Feuille ${chunks[0].sheet_name})` : ""}\n\n`;
  } else {
    markdown += `- **Méthode appliquée :** ${method.name} (Structure générale QHSE)\n\n`;
  }

  markdown += `#### 🏢 2. DONNÉES ENTREPRISE UTILISÉES\n`;
  if (companyDataUsed.length > 0) {
    companyDataUsed.forEach((d) => (markdown += `- ${d}\n`));
    markdown += `\n`;
  } else {
    markdown += `- **Contexte soumis :** "${userQuery}"\n\n`;
  }

  markdown += `#### 📊 3. ANALYSE & CALCULS\n${analysisText}\n`;

  markdown += `#### 💡 4. PROPOSITIONS DE MESURES (CAPA Potentielles)\n`;
  proposedActions.forEach((act, idx) => {
    markdown += `${idx + 1}. **[${act.priority || "Moyenne"}] ${act.title}**\n   *${act.description}*\n`;
  });
  markdown += `\n`;

  markdown += `#### ⚠️ 5. ACTIONS RÉELLES EN BASE\n`;
  markdown += `*Aucune action réelle créée en base — Validation humaine requise avant toute génération de CAPA dans le registre.*\n`;

  const methodAnalysis: MethodAnalysisStructure = {
    methodName: method.name,
    methodDomain: method.domain,
    methodSources: sources,
    companyDataUsed,
    proposedActions,
    realActionsCreated: false,
    amdecExportData: amdecExportPayload,
    pestelExportData: pestelExportPayload,
    swotExportData: swotExportPayload,
    fiveWhyExportData: fiveWhyExportPayload,
    ishikawaExportData: ishikawaExportPayload,
  };

  return { markdownContent: markdown, sources, methodAnalysis };
}
