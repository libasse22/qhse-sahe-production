function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(";") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Génère un CSV (séparateur point-virgule, compatible Excel FR) et déclenche
 * son téléchargement. Aucune dépendance npm : tout se fait en mémoire côté
 * navigateur à partir de données déjà chargées.
 */
export function downloadCsv(fileName: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(";"));
  // BOM UTF-8 : évite les accents mal affichés à l'ouverture dans Excel.
  const csvContent = "\uFEFF" + lines.join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEpiToCsv(assignments: any[]) {
  const headers = [
    "Employé",
    "Équipement (EPI)",
    "Catégorie",
    "Taille",
    "N° Série",
    "État",
    "Statut",
    "Date de Remise",
    "Échéance Renouvellement",
  ];

  const rows = assignments.map((a) => [
    a.recipientName || "—",
    a.catalogName || "—",
    a.category || "—",
    a.size || "—",
    a.serialNumber || "—",
    a.conditionState || "—",
    a.status || "—",
    a.assignedAt ? new Date(a.assignedAt).toLocaleDateString("fr-FR") : "—",
    a.renewalDueAt ? new Date(a.renewalDueAt).toLocaleDateString("fr-FR") : "Selon usure",
  ]);

  const dateStr = new Date().toISOString().split("T")[0];
  downloadCsv(`registre_epi_${dateStr}.csv`, headers, rows);
}

export function exportQhseReportToCsv(reportData: any) {
  const headers = ["Domaine / Catégorie", "Indicateur / Libellé", "Valeur / Résultat", "Statut / Remarque"];
  const rows: (string | number)[][] = [
    ["SYNTHÈSE EXÉCUTIVE", "Période", reportData.periodLabel || "—", reportData.companyName || "—"],
    ["SYNTHÈSE EXÉCUTIVE", "Score Global Conformité", reportData.globalComplianceScore !== null ? `${reportData.globalComplianceScore}%` : "N/A", reportData.globalStatus || "NA"],
    
    ["INCIDENTS", "Total Incidents", reportData.incidents?.total?.value ?? "N/A", "Sur la période"],
    ["INCIDENTS", "Incidents Critiques", reportData.incidents?.critique ?? 0, "Niveau 4"],
    ["INCIDENTS", "Taux de Traitement", reportData.incidents?.tauxTraitement?.value ?? "N/A", reportData.incidents?.tauxTraitement?.isNa ? "Aucune donnée" : "Conforme"],
    
    ["INSPECTIONS", "Inspections Réalisées", reportData.inspections?.total?.value ?? "N/A", "Sur la période"],
    ["INSPECTIONS", "Taux de Conformité", reportData.inspections?.tauxConformite?.value ?? "N/A", reportData.inspections?.tauxConformite?.isNa ? "Aucune donnée" : "Conforme"],
    
    ["CAPA", "Actions Totales", reportData.capa?.total?.value ?? "N/A", "Sur la période"],
    ["CAPA", "Actions Clôturées", reportData.capa?.cloturees ?? 0, "Actions terminées"],
    ["CAPA", "Actions Bloquées", reportData.capa?.bloquees ?? 0, reportData.capa?.bloquees > 0 ? "Alerte Blocage" : "R.A.S."],
    ["CAPA", "Actions En Retard", reportData.capa?.enRetard ?? 0, reportData.capa?.enRetard > 0 ? "Alerte Retard" : "R.A.S."],
    ["CAPA", "Taux de Clôture", reportData.capa?.tauxCloture?.value ?? "N/A", reportData.capa?.tauxCloture?.isNa ? "Aucune donnée" : "Conforme"],
    
    ["PERMIS DE TRAVAIL", "Permis Émis", reportData.permits?.total?.value ?? "N/A", "Sur la période"],
    ["PERMIS DE TRAVAIL", "Permis Actifs (En Cours)", reportData.permits?.actifs ?? 0, "Chantiers en cours"],
    ["PERMIS DE TRAVAIL", "Permis Suspendus", reportData.permits?.suspendus ?? 0, reportData.permits?.suspendus > 0 ? "Alerte Suspension" : "R.A.S."],
    
    ["EPI", "Dotations Totales", reportData.epi?.totalAttribues?.value ?? "N/A", "Sur la période"],
    ["EPI", "EPI Défectueux / À Remplacer", reportData.epi?.defectueux ?? 0, reportData.epi?.defectueux > 0 ? "Alerte Non-Conformité" : "R.A.S."],
    ["EPI", "Taux de Conformité EPI", reportData.epi?.tauxConformite?.value ?? "N/A", reportData.epi?.tauxConformite?.isNa ? "Aucune donnée" : "Conforme"],
  ];

  const dateStr = new Date().toISOString().split("T")[0];
  downloadCsv(`bilan_qhse_${dateStr}.csv`, headers, rows);
}

