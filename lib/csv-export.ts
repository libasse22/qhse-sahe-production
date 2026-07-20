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
