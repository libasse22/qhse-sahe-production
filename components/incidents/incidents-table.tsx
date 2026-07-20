"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/incidents/severity-badge";
import { IncidentStatusBadge } from "@/components/incidents/status-badge";
import { downloadCsv } from "@/lib/csv-export";
import {
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  type Incident,
} from "@/lib/types/incidents";

export function IncidentsTable({ incidents }: { incidents: Incident[] }) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return incidents.filter((incident) => {
      if (severity && incident.severity !== severity) return false;
      if (status && incident.status !== status) return false;
      if (
        q &&
        !incident.title.toLowerCase().includes(q) &&
        !incident.location.toLowerCase().includes(q) &&
        !incident.reportedByName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [incidents, query, severity, status]);

  function handleExport() {
    downloadCsv(
      `incidents-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Titre", "Gravité", "Statut", "Lieu", "Déclarant", "Assigné à", "Date"],
      filtered.map((i) => [
        i.title,
        SEVERITY_LABELS[i.severity],
        STATUS_LABELS[i.status],
        i.location,
        i.reportedByName,
        i.assignedToName ?? "",
        new Date(i.occurredAt).toLocaleDateString("fr-FR"),
      ]),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un titre, un lieu, un déclarant…"
            className="pl-9"
          />
        </div>
        <Select value={severity} onChange={(e) => setSeverity(e.target.value)} className="sm:w-48">
          <option value="">Toutes gravités</option>
          {SEVERITY_ORDER.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
          <option value="">Tous statuts</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button type="button" variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Aucun incident ne correspond à ta recherche.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-6 py-3 font-medium">Titre</th>
                <th className="px-6 py-3 font-medium">Gravité</th>
                <th className="px-6 py-3 font-medium">Statut</th>
                <th className="px-6 py-3 font-medium">Déclarant</th>
                <th className="px-6 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident) => (
                <tr key={incident.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-6 py-3">
                    <Link href={`/incidents/${incident.id}`} className="font-medium hover:underline">
                      {incident.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{incident.location}</p>
                  </td>
                  <td className="px-6 py-3">
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td className="px-6 py-3">
                    <IncidentStatusBadge status={incident.status} />
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{incident.reportedByName}</td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {new Date(incident.occurredAt).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
