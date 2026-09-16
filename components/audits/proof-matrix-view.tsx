"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Eye, Filter } from "lucide-react";
import {
  AUDIT_ITEM_STATUS_BADGE,
  AUDIT_ITEM_STATUS_LABELS,
  AUDIT_PROOF_TYPE_LABELS,
  type AuditItem,
  type AuditProofLink,
} from "@/lib/types/audit";

interface ProofMatrixViewProps {
  items: AuditItem[];
  proofLinks: AuditProofLink[];
  onOpenProofModal: (proof: AuditProofLink) => void;
}

export function ProofMatrixView({ items, proofLinks, onOpenProofModal }: ProofMatrixViewProps) {
  const [filterMode, setFilterMode] = useState<string>("tous");

  // Construction de la matrice : association point <-> preuve
  const rows: Array<{
    item: AuditItem;
    proof?: AuditProofLink;
  }> = [];

  items.forEach((item) => {
    if (item.proofLinks && item.proofLinks.length > 0) {
      item.proofLinks.forEach((proof) => {
        rows.push({ item, proof });
      });
    } else {
      rows.push({ item });
    }
  });

  // Application des filtres
  const filteredRows = rows.filter((r) => {
    if (filterMode === "preuves_manquantes") {
      return !r.proof && r.item.status !== "non_applicable";
    }
    if (filterMode === "preuves_disponibles") {
      return !!r.proof;
    }
    if (filterMode === "non_conformites") {
      return r.item.status === "non_conforme";
    }
    if (filterMode === "observations") {
      return r.item.status === "observation";
    }
    if (filterMode === "capa_ouvertes") {
      return !!r.item.capaActionId;
    }
    return true;
  });

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold">Registre & Matrice 360° des Preuves</CardTitle>
          <CardDescription>
            Matrice de traçabilité liant les exigences d'audit aux preuves probantes et actions CAPA.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="text-xs h-8">
            <option value="tous">Toutes les lignes ({rows.length})</option>
            <option value="preuves_disponibles">Preuves disponibles</option>
            <option value="preuves_manquantes">Preuves manquantes</option>
            <option value="non_conformites">Non-conformités</option>
            <option value="observations">Observations</option>
            <option value="capa_ouvertes">CAPA ouvertes</option>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">
            Aucune ligne ne correspond aux filtres sélectionnés.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-accent/40 text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Point d'audit</th>
                  <th className="px-4 py-3 font-medium">Exigence</th>
                  <th className="px-4 py-3 font-medium">Statut Point</th>
                  <th className="px-4 py-3 font-medium">Preuve Rattachée</th>
                  <th className="px-4 py-3 font-medium">Type Preuve</th>
                  <th className="px-4 py-3 font-medium">Date Rattachement</th>
                  <th className="px-4 py-3 font-medium text-right">Inspection 360°</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRows.map((r, idx) => (
                  <tr key={`${r.item.id}-${r.proof?.id || idx}`} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                      {r.item.title}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate">
                      {r.item.requirement || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={AUDIT_ITEM_STATUS_BADGE[r.item.status]}>
                        {AUDIT_ITEM_STATUS_LABELS[r.item.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {r.proof ? (
                        <span className="text-primary">{r.proof.title}</span>
                      ) : (
                        <span className="text-amber-600 italic">⚠️ Preuve manquante</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.proof ? AUDIT_PROOF_TYPE_LABELS[r.proof.proofType] : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.proof ? new Date(r.proof.createdAt).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.proof ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onOpenProofModal(r.proof!)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-primary" />
                          Voir preuve
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">Non liée</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
