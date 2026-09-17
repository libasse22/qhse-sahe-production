"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  FileCheck,
  FileX,
  FileText,
} from "lucide-react";
import type {
  QhseDocument,
  DocumentRevision,
  DocumentRetentionPolicy,
  RejectionCategory,
  ExternalVerificationStatus,
} from "@/lib/types/document";
import { REJECTION_CATEGORY_LABELS } from "@/lib/types/document";
import { verifyExternalDocument, rejectExternalDocument } from "@/lib/services/documents.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface DocumentMasteryCardProps {
  document: QhseDocument;
  currentRevision?: DocumentRevision | null;
  retentionPolicy?: DocumentRetentionPolicy | null;
  canManage: boolean;
}

export function DocumentMasteryCard({
  document: doc,
  currentRevision,
  retentionPolicy,
  canManage,
}: DocumentMasteryCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionCategory, setRejectionCategory] = useState<RejectionCategory>("source_non_fiable");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isExternal = doc.originType === "externe";
  const verificationStatus: ExternalVerificationStatus =
    currentRevision?.verificationStatus || doc.activeRevisionVerification || (isExternal ? "a_verifier" : "verifie");

  function handleVerify() {
    if (!currentRevision) return;
    setError(null);
    startTransition(async () => {
      const res = await verifyExternalDocument(currentRevision.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentRevision) return;
    if (!rejectionReason.trim()) {
      setError("Le motif détaillé du rejet est obligatoire.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await rejectExternalDocument({
        revisionId: currentRevision.id,
        rejectionCategory,
        rejectionReason: rejectionReason.trim(),
      });

      if (res.error) {
        setError(res.error);
      } else {
        setShowRejectModal(false);
        setRejectionReason("");
        router.refresh();
      }
    });
  }

  // Label & variant du statut temporel
  let stateBadgeVariant: "outline" | "secondary" | "warning" | "destructive" | "success" = "outline";
  let stateBadgeLabel = "Normal";

  if (doc.calculatedState === "expire") {
    stateBadgeVariant = "destructive";
    stateBadgeLabel = "Document expiré";
  } else if (doc.calculatedState === "echeance_proche") {
    stateBadgeVariant = "warning";
    stateBadgeLabel = "Échéance proche";
  } else if (doc.calculatedState === "revue_depassee") {
    stateBadgeVariant = "destructive";
    stateBadgeLabel = "Revue dépassée";
  } else if (doc.calculatedState === "revue_proche") {
    stateBadgeVariant = "warning";
    stateBadgeLabel = "Revue à prévoir";
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
            Maîtrise Documentaire & Conformité ISO 7.5
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isExternal ? "secondary" : "outline"} className="capitalize">
            {isExternal ? "Origine Externe" : "Origine Interne"}
          </Badge>
          {doc.calculatedState && doc.calculatedState !== "normal" && (
            <Badge variant={stateBadgeVariant}>{stateBadgeLabel}</Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {/* SECTION DOCUMENT EXTERNE & VÉRIFICATION */}
      {isExternal ? (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vérification de la révision ({currentRevision?.revisionCode || "REV00"})
            </span>

            {verificationStatus === "verifie" && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Vérifié conforme
              </Badge>
            )}
            {verificationStatus === "a_verifier" && (
              <Badge variant="warning" className="gap-1">
                <Clock className="w-3.5 h-3.5" />
                À vérifier
              </Badge>
            )}
            {verificationStatus === "rejete" && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Rejeté
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Organisme / Émetteur :</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {doc.externalSource || "Non spécifié"}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Référence externe :</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {doc.externalReference || "Non spécifiée"}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Date du document externe :</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {doc.externalDocumentDate
                  ? new Date(doc.externalDocumentDate).toLocaleDateString("fr-FR")
                  : "—"}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Date de réception :</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {doc.externalReceivedDate
                  ? new Date(doc.externalReceivedDate).toLocaleDateString("fr-FR")
                  : "—"}
              </span>
            </div>
          </div>

          {/* DÉTAILS DE VÉRIFICATION / REJET */}
          {currentRevision?.verifiedByName && (
            <div className="pt-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
              Vérifié par : <span className="font-medium">{currentRevision.verifiedByName}</span> le{" "}
              {currentRevision.verifiedAt
                ? new Date(currentRevision.verifiedAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </div>
          )}

          {verificationStatus === "rejete" && currentRevision?.rejectionReason && (
            <div className="p-3 bg-red-100/70 dark:bg-red-950/70 text-red-900 dark:text-red-200 rounded-lg text-xs space-y-1 border border-red-200 dark:border-red-900">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                Motif de rejet :{" "}
                {currentRevision.rejectionCategory
                  ? REJECTION_CATEGORY_LABELS[currentRevision.rejectionCategory]
                  : "Rejet"}
              </div>
              <p className="pl-5 italic">{currentRevision.rejectionReason}</p>
            </div>
          )}

          {/* ACTIONS VÉRIFICATION / REJET */}
          {canManage && verificationStatus === "a_verifier" && (
            <div className="flex items-center gap-3 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-emerald-600 text-white hover:bg-emerald-700 border-none gap-1.5"
                disabled={isPending}
                onClick={handleVerify}
              >
                <FileCheck className="w-4 h-4" />
                Vérifier & Valider conforme
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5"
                disabled={isPending}
                onClick={() => setShowRejectModal(true)}
              >
                <FileX className="w-4 h-4" />
                Rejeter cette version
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-3 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 border border-slate-100 dark:border-slate-800">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span>
            Document créé et vérifié en interne (Codification automatique :{" "}
            <strong>{doc.codeReference || "N/A"}</strong>).
          </span>
        </div>
      )}

      {/* CONSERVATION & ÉCHÉANCES DE REVUE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <span>Revue Périodique ISO</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {doc.reviewDate ? new Date(doc.reviewDate).toLocaleDateString("fr-FR") : "Non programmée"}
          </p>
        </div>

        <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Date d'Échéance / Expiration</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("fr-FR") : "Permanente (Sans date)"}
          </p>
        </div>

        <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Politique de Conservation</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {doc.retentionDurationYears
              ? `${doc.retentionDurationYears} ${doc.retentionUnit || "ans"}`
              : retentionPolicy
              ? `${retentionPolicy.retentionYears} ${retentionPolicy.retentionUnit || "ans"} (Par défaut)`
              : "Politique standard (5 ans)"}
          </p>
        </div>
      </div>

      {/* MODAL REJET REVISION */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Rejeter la Révision Externe
              </h4>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catégorie du motif de rejet *
                </label>
                <select
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value as RejectionCategory)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
                >
                  {Object.entries(REJECTION_CATEGORY_LABELS).map(([cat, label]) => (
                    <option key={cat} value={cat}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Explication détaillée / Remarques *
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Préciser les raisons du rejet pour archivage dans l'historique d'audit..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowRejectModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="destructive" disabled={isPending}>
                  {isPending ? "Enregistrement..." : "Confirmer le Rejet"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
