"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv-export";
import { ACTION_STATUS_LABELS, type ActionCorrective } from "@/lib/types/actions";

export function ExportActionsCsvButton({ actions }: { actions: ActionCorrective[] }) {
  function handleExport() {
    downloadCsv(
      `actions-correctives-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Incident", "Action", "Responsable", "Échéance", "Statut"],
      actions.map((a) => [
        a.incidentTitle,
        a.description,
        a.responsableName,
        new Date(a.echeance).toLocaleDateString("fr-FR"),
        ACTION_STATUS_LABELS[a.status],
      ]),
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={actions.length === 0}>
      <Download className="h-4 w-4" />
      Exporter CSV
    </Button>
  );
}
