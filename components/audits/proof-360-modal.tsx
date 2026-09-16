"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, X } from "lucide-react";
import { AUDIT_PROOF_TYPE_LABELS, type AuditProofLink } from "@/lib/types/audit";
import { getProof360Details } from "@/lib/services/audits.service";

interface Proof360ModalProps {
  proof: AuditProofLink | null;
  onClose: () => void;
}

export function Proof360Modal({ proof, onClose }: Proof360ModalProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<Record<string, any> | null>(null);

  if (proof && !details && !loading) {
    setLoading(true);
    getProof360Details(proof)
      .then((res) => setDetails(res))
      .finally(() => setLoading(false));
  }

  if (!proof) return null;

  const handleClose = () => {
    setDetails(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {AUDIT_PROOF_TYPE_LABELS[proof.proofType]}
              </Badge>
              <h3 className="text-lg font-bold text-foreground">{proof.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Inspection 360° de la preuve depuis le système source (Mode &quot;Montrez-moi la Preuve&quot;).
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Chargement des éléments de preuve 360°...
          </div>
        ) : !details ? (
          <div className="py-6 text-center text-sm text-destructive">
            Élément de preuve introuvable ou supprimé du système source.
          </div>
        ) : (
          <div className="space-y-4 py-2 text-sm">
            {/* 1. DOCUMENT GED */}
            {details.type === "ged_document" && (
              <div className="space-y-3 rounded-lg border border-border p-4 bg-accent/20">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <p className="font-semibold">{details.title}</p>
                    <p className="text-xs text-muted-foreground">Code : {details.codeReference || "—"}</p>
                  </div>
                  <Badge variant={details.status === "en_vigueur" ? "success" : "secondary"}>
                    {details.status === "en_vigueur" ? "En vigueur" : details.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Date d'effet : </span>
                    <strong>{details.effectiveDate ? new Date(details.effectiveDate).toLocaleDateString("fr-FR") : "Non définie"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Version active : </span>
                    <strong className="text-primary">
                      {details.activeRevision ? `v${details.activeRevision.version_label} (Rev #${details.activeRevision.version_number})` : "Aucune révision active"}
                    </strong>
                  </div>
                </div>

                <div className="border-t border-border pt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Signatures enregistrées :</p>
                  {details.signatures && details.signatures.length > 0 ? (
                    <ul className="space-y-1 text-xs">
                      {details.signatures.map((sig: any) => (
                        <li key={sig.id} className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>{sig.signer_name} ({sig.role || "Signataire"}) — {new Date(sig.signed_at).toLocaleDateString("fr-FR")}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Aucune émargement/signature sur cette version.</p>
                  )}
                </div>
              </div>
            )}

            {/* 2. INCIDENT */}
            {details.type === "incident" && (
              <div className="space-y-3 rounded-lg border border-border p-4 bg-accent/20">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <p className="font-semibold">{details.title}</p>
                    <p className="text-xs text-muted-foreground">Réf : {details.codeReference || "—"}</p>
                  </div>
                  <Badge variant={details.severity === "critique" ? "destructive" : "warning"}>
                    {details.severity}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Date incident : </span><strong>{new Date(details.date).toLocaleDateString("fr-FR")}</strong></div>
                  <div><span className="text-muted-foreground">Lieu : </span><strong>{details.location || "Non spécifié"}</strong></div>
                </div>
              </div>
            )}

            {/* 3. INSPECTION */}
            {details.type === "inspection" && (
              <div className="space-y-3 rounded-lg border border-border p-4 bg-accent/20">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <p className="font-semibold">{details.title}</p>
                    <p className="text-xs text-muted-foreground">Inspecteur : {details.inspectorName || "—"}</p>
                  </div>
                  <Badge variant="success">{details.scorePercentage ?? 0} % score</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Finalisée le : {details.completedAt ? new Date(details.completedAt).toLocaleDateString("fr-FR") : "En cours"}</p>
              </div>
            )}

            {/* 4. PERMIS DE TRAVAIL */}
            {details.type === "work_permit" && (
              <div className="space-y-3 rounded-lg border border-border p-4 bg-accent/20">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <p className="font-semibold">{details.title}</p>
                    <p className="text-xs text-muted-foreground">Permis N° {details.permitNumber}</p>
                  </div>
                  <Badge variant="outline">{details.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Début : </span><strong>{new Date(details.startTime).toLocaleString("fr-FR")}</strong></div>
                  <div><span className="text-muted-foreground">Fin : </span><strong>{new Date(details.endTime).toLocaleString("fr-FR")}</strong></div>
                </div>
              </div>
            )}

            {/* 5. CAPA */}
            {details.type === "capa_action" && (
              <div className="space-y-3 rounded-lg border border-border p-4 bg-accent/20">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <p className="font-semibold">{details.codeReference}</p>
                    <p className="text-xs text-muted-foreground">{details.title}</p>
                  </div>
                  <Badge variant={details.status === "cloturee" ? "success" : "warning"}>{details.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Responsable : </span><strong>{details.responsableName}</strong></div>
                  <div><span className="text-muted-foreground">Échéance : </span><strong>{new Date(details.echeance).toLocaleDateString("fr-FR")}</strong></div>
                </div>
              </div>
            )}

            {/* 6. EPI ASSIGNMENT */}
            {details.type === "epi_assignment" && (
              <div className="space-y-3 rounded-lg border border-border p-4 bg-accent/20">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <p className="font-semibold">{details.title}</p>
                    <p className="text-xs text-muted-foreground">Attribué à : {details.employeeName}</p>
                  </div>
                  <Badge variant="success">{details.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Date attribution : </span><strong>{new Date(details.assignedAt).toLocaleDateString("fr-FR")}</strong></div>
                  <div><span className="text-muted-foreground">Renouvellement : </span><strong>{new Date(details.renewalDueAt).toLocaleDateString("fr-FR")}</strong></div>
                </div>
              </div>
            )}

            {/* BOUTON D'ACCÈS AU MODULE SOURCE */}
            {details.sourceUrl && (
              <div className="flex justify-end border-t border-border pt-3">
                <Button asChild variant="outline" size="sm">
                  <Link href={details.sourceUrl} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Ouvrir la fiche dans le module source
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
