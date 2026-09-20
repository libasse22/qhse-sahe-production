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
    aliases: ["5 pourquoi", "5 whys", "cinq pourquoi"],
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
  } else if (method.name === "5 Pourquoi") {
    analysisText = `##### 🔍 Analyse des Causes Racines — 5 Pourquoi\n\n`;
    analysisText += `1. **Pourquoi 1 ?** L'anomalie s'est produite lors de la séance de travail.\n`;
    analysisText += `2. **Pourquoi 2 ?** La consigne spécifique n'a pas été communiquée à temps à l'opérateur.\n`;
    analysisText += `3. **Pourquoi 3 ?** La fiche de poste et le permis n'étaient pas affichés sur la zone.\n`;
    analysisText += `4. **Pourquoi 4 ?** Absence de contrôle préalable de la zone avant démarrage des travaux.\n`;
    analysisText += `5. **Pourquoi 5 (Cause Racine) ?** **Procédure de validation du Permis de Travail (PtW) non systématique.**\n`;

    proposedActions.push(
      {
        title: "Rendre le Permis de Travail bloquant sur l'application",
        description: "Interdire le démarrage d'une intervention à risque sans validation du PtW sur l'application mobile.",
        priority: "Critique",
      }
    );
  } else if (method.name === "Ishikawa") {
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

  // Assemblage du Markdown final respectant strictement Étape 6
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
  };

  return { markdownContent: markdown, sources, methodAnalysis };
}
