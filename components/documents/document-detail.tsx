"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  FilePlus,
  ArrowLeft,
  Calendar,
  Tag,
  Folder,
  History,
  Link as LinkIcon,
  CheckCircle2,
  Archive,
  RotateCcw,
  ShieldCheck,
  User,
  Plus,
  PenTool,
  Printer,
  FileCheck2,
  Send,
  AlertCircle,
} from "lucide-react";
import type { DocumentDetails, DocumentStatus } from "@/lib/types/document";
import {
  setRevisionStatus,
  archiveDocument,
  restoreDocument,
  linkDocumentToEntity,
  requestDocumentSignature,
  updateRevisionWorkflowStatus,
} from "@/lib/services/documents.service";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { DocumentMasteryCard } from "@/components/documents/document-mastery-card";
import { CreateRevisionModal } from "@/components/documents/create-revision-modal";
import { SignatureModal } from "@/components/documents/signature-modal";
import { PaperSignedUploadModal } from "@/components/documents/paper-signed-upload-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DocumentDetail({
  details,
  canManage,
}: {
  details: DocumentDetails;
  canManage: boolean;
}) {
  const router = useRouter();
  const { document: doc, folder, revisions, links, history, signatures } = details;
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isPaperUploadModalOpen, setIsPaperUploadModalOpen] = useState(false);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "workflow" | "revisions" | "links" | "history">("workflow");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Formulaire demande signature
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("Responsable QHSE");
  const [isAddingSigner, setIsAddingSigner] = useState(false);

  // Formulaire liaison rapide
  const [linkEntityType, setLinkEntityType] = useState("work_permit");
  const [linkEntityId, setLinkEntityId] = useState("");
  const [isAddingLink, setIsAddingLink] = useState(false);

  const currentRevision = revisions.find((r) => r.status === "en_vigueur") || revisions[0];
  const displayCode = doc.codeReference
    ? `${doc.codeReference}-${doc.revisionCode || "REV00"}`
    : `DOC-${doc.revisionCode || "REV00"}`;

  function handleActivateRevision(revisionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await setRevisionStatus(revisionId, "en_vigueur");
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleWorkflowTransition(newStatus: DocumentStatus) {
    if (!currentRevision) return;
    setError(null);
    startTransition(async () => {
      const res = await updateRevisionWorkflowStatus({
        documentId: doc.id,
        revisionId: currentRevision.id,
        newStatus,
      });
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleAddSigner(e: React.FormEvent) {
    e.preventDefault();
    if (!signerName.trim() || !currentRevision) return;

    setError(null);
    startTransition(async () => {
      const res = await requestDocumentSignature({
        documentId: doc.id,
        revisionId: currentRevision.id,
        signerName: signerName.trim(),
        signerRole: signerRole.trim(),
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSignerName("");
        setIsAddingSigner(false);
        router.refresh();
      }
    });
  }

  function handleArchive() {
    if (!confirm("Archiver ce document ?")) return;
    startTransition(async () => {
      const res = await archiveDocument(doc.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const res = await restoreDocument(doc.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkEntityId.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await linkDocumentToEntity(doc.id, linkEntityType, linkEntityId.trim());
      if (res.error) {
        setError(res.error);
      } else {
        setLinkEntityId("");
        setIsAddingLink(false);
        router.refresh();
      }
    });
  }

  const workflowSteps: { status: DocumentStatus; label: string }[] = [
    { status: "brouillon", label: "1. Brouillon" },
    { status: "en_revue", label: "2. En Revue" },
    { status: "en_attente_signature", label: "3. Validation / Signature" },
    { status: "approuve", label: "4. Approuvé" },
    { status: "en_vigueur", label: "5. En Vigueur" },
  ];

  const currentStepIndex = workflowSteps.findIndex((s) => s.status === (doc.status || "en_vigueur"));

  return (
    <div className="space-y-6">
      {/* Retour & Navigation */}
      <div>
        <Link href="/documents" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary mb-3">
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la GED Enterprise
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Header Fiche Document */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              {displayCode}
            </span>
            <DocumentStatusBadge status={doc.status} />
            <span className="text-xs font-medium uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {doc.documentType} · {doc.domaineQhse || "HSE"}
            </span>
          </div>

          <h1 className="text-xl font-bold text-foreground tracking-tight">{doc.title}</h1>

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {folder && (
              <span className="flex items-center gap-1">
                <Folder className="h-3.5 w-3.5 text-amber-500" />
                {folder.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              Auteur: {doc.uploadedByName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Création: {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {doc.url && (
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              Consulter / Télécharger
            </a>
          )}

          {canManage && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRevisionModalOpen(true)}
                className="gap-1.5 text-xs border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              >
                <FilePlus className="h-3.5 w-3.5 text-amber-600" />
                Nouvelle révision
              </Button>

              {doc.status === "archive" ? (
                <Button type="button" variant="outline" size="sm" onClick={handleRestore} disabled={isPending} className="gap-1 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restaurer
                </Button>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={handleArchive} disabled={isPending} className="gap-1 text-xs text-muted-foreground hover:text-destructive">
                  <Archive className="h-3.5 w-3.5" />
                  Archiver
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Phase L — Maîtrise Documentaire & ISO 7.5 */}
      <DocumentMasteryCard
        document={doc}
        currentRevision={currentRevision}
        retentionPolicy={details.retentionPolicy}
        canManage={canManage}
      />

      {/* Tabs Bar */}
      <div className="flex border-b border-border text-xs font-medium">
        <button
          onClick={() => setActiveTab("workflow")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "workflow" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <PenTool className="h-3.5 w-3.5" />
          Workflow & Signatures
        </button>
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === "overview" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Identité & Métadonnées
        </button>
        <button
          onClick={() => setActiveTab("revisions")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "revisions" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Révisions physiques ({revisions.length})
        </button>
        <button
          onClick={() => setActiveTab("links")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "links" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <LinkIcon className="h-3.5 w-3.5" />
          Objets liés ({links.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "history" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Journal d'audit ({history.length})
        </button>
      </div>

      {/* TAB CONTENT: Workflow & Signatures */}
      {activeTab === "workflow" && (
        <div className="space-y-6">
          {/* Stepper Progression Workflow */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Cycle de Validation de la Révision {currentRevision?.revisionCode || "REV00"}</h3>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {workflowSteps.map((step, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div
                    key={step.status}
                    className={`rounded-lg p-2.5 border transition-all ${
                      isCurrent
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : isPassed
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                        : "border-border bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <p className="text-[11px] truncate">{step.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Transition Actions Server-Controlled */}
            {canManage && (
              <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
                <span className="text-xs text-muted-foreground mr-2 font-medium">Faire évoluer le statut :</span>
                {doc.status === "brouillon" && (
                  <Button size="sm" onClick={() => handleWorkflowTransition("en_revue")} disabled={isPending} className="gap-1 text-xs">
                    <Send className="h-3.5 w-3.5" />
                    Envoyer en revue
                  </Button>
                )}
                {doc.status === "en_revue" && (
                  <Button size="sm" onClick={() => handleWorkflowTransition("en_attente_signature")} disabled={isPending} className="gap-1 text-xs bg-amber-600 hover:bg-amber-700 text-white">
                    <PenTool className="h-3.5 w-3.5" />
                    Demander les signatures
                  </Button>
                )}
                {doc.status === "en_attente_signature" && (
                  <Button size="sm" onClick={() => handleWorkflowTransition("approuve")} disabled={isPending} className="gap-1 text-xs bg-teal-600 hover:bg-teal-700 text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approuver la révision
                  </Button>
                )}
                {doc.status === "approuve" && (
                  <Button size="sm" onClick={() => handleWorkflowTransition("en_vigueur")} disabled={isPending} className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Mettre en vigueur
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Section Circuit Papier */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Printer className="h-4 w-4 text-blue-600" />
                  Circuit Papier & Signature Physique
                </h3>
                <p className="text-xs text-muted-foreground">Exportation pour impression et réimport du scan signé (l'original reste préservé)</p>
              </div>

              <div className="flex items-center gap-2">
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                    Exporter pour signature
                  </a>
                )}
                {canManage && currentRevision && (
                  <Button
                    size="sm"
                    onClick={() => setIsPaperUploadModalOpen(true)}
                    className="gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FileCheck2 className="h-3.5 w-3.5" />
                    Importer document signé
                  </Button>
                )}
              </div>
            </div>

            {currentRevision?.signedStoragePath ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Scan papier signé rattaché avec succès à la révision {currentRevision.revisionCode}
                </div>
                {currentRevision.signedUrl && (
                  <a href={currentRevision.signedUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 hover:underline">
                    Consulter le scan signé
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                Aucun scan papier signé n'a été importé pour cette révision. Vous pouvez utiliser le circuit papier ou la signature écran ci-dessous.
              </div>
            )}
          </div>

          {/* Section Registre des Signataires */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-emerald-600" />
                  Registre des Signataires & Émargements Écran
                </h3>
                <p className="text-xs text-muted-foreground">Signatures attachées exclusivement à la révision {currentRevision?.revisionCode || "REV00"}</p>
              </div>

              {canManage && (
                <Button size="sm" variant="outline" onClick={() => setIsAddingSigner(!isAddingSigner)} className="gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un signataire
                </Button>
              )}
            </div>

            {isAddingSigner && (
              <form onSubmit={handleAddSigner} className="flex items-end gap-3 rounded-lg border border-border bg-card p-3">
                <div className="space-y-1 text-xs flex-1">
                  <label className="font-medium text-foreground">Nom du signataire *</label>
                  <Input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="ex: Mamadou Ndiaye (Directeur HSE)"
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1 text-xs flex-1">
                  <label className="font-medium text-foreground">Rôle / Fonction</label>
                  <Input
                    value={signerRole}
                    onChange={(e) => setSignerRole(e.target.value)}
                    placeholder="ex: Responsable Validateur"
                    className="h-8 text-xs"
                  />
                </div>
                <Button type="submit" size="sm" disabled={isPending} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  Demander
                </Button>
              </form>
            )}

            {signatures.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-lg border border-border p-4 bg-card">Aucune demande de signature enregistrée pour cette révision.</p>
            ) : (
              <div className="space-y-2">
                {signatures.map((sig) => (
                  <div key={sig.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-2 ${sig.signatureStatus === "signed" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                        <PenTool className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{sig.signerName}</p>
                        <p className="text-[11px] text-muted-foreground">{sig.signerRole || "Signataire"} · {sig.signatureMode}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {sig.signatureStatus === "signed" ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 text-xs">
                          <CheckCircle2 className="h-4 w-4" /> Signé le {sig.signedAt ? new Date(sig.signedAt).toLocaleDateString("fr-FR") : ""}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setActiveSignatureId(sig.id);
                            setIsSignatureModalOpen(true);
                          }}
                          className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <PenTool className="h-3.5 w-3.5" />
                          Signer sur écran
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Caractéristiques documentaires</h3>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Code Référence</dt>
                <dd className="font-mono font-medium text-foreground">{doc.codeReference || "Non codifié"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Code Révision Actuelle</dt>
                <dd className="font-mono font-medium text-foreground">{doc.revisionCode || "REV00"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Version Majeure / Mineure</dt>
                <dd className="font-medium text-foreground">v{doc.versionMajor ?? 1}.{doc.versionMinor ?? 0}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Type de document</dt>
                <dd className="capitalize font-medium text-foreground">{doc.documentType}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Domaine QHSE</dt>
                <dd className="capitalize font-medium text-foreground">{doc.domaineQhse || "Sécurité"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Catégorie</dt>
                <dd className="font-medium text-foreground">{doc.category}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Fichier & Échéances</h3>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Nom original fichier</dt>
                <dd className="font-mono text-foreground truncate">{doc.originalFilename || "Fichier PDF/Doc"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Taille du fichier</dt>
                <dd className="font-medium text-foreground">{doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(2)} MB` : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Date de mise en vigueur</dt>
                <dd className="font-medium text-foreground">{doc.effectiveDate ? new Date(doc.effectiveDate).toLocaleDateString("fr-FR") : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Date d'expiration</dt>
                <dd className="font-medium text-amber-600">{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("fr-FR") : "Aucune (Illimité)"}</dd>
              </div>
            </dl>

            {doc.tags && doc.tags.length > 0 && (
              <div className="pt-2">
                <dt className="text-xs text-muted-foreground mb-1">Tags d'indexation</dt>
                <div className="flex flex-wrap gap-1">
                  {doc.tags.map((t, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                      <Tag className="h-3 w-3" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Revisions */}
      {activeTab === "revisions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Historique des révisions physiques</h3>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setIsRevisionModalOpen(true)} className="gap-1 text-xs">
                <FilePlus className="h-3.5 w-3.5 text-amber-500" />
                Nouvelle révision
              </Button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Révision</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Résumé des modifications</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Fichiers</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {revisions.map((rev) => (
                  <tr key={rev.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{rev.revisionCode}</td>
                    <td className="px-4 py-3 font-medium">v{rev.versionMajor}.{rev.versionMinor}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">{rev.changeSummary || "—"}</td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge status={rev.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="space-y-0.5">
                        {rev.url && (
                          <a href={rev.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            <Download className="h-3 w-3" /> Original
                          </a>
                        )}
                        {rev.signedUrl && (
                          <a href={rev.signedUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline">
                            <FileCheck2 className="h-3 w-3" /> Scan Signé
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {canManage && rev.status !== "en_vigueur" && (
                        <button
                          type="button"
                          onClick={() => handleActivateRevision(rev.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline font-medium"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Activer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Links */}
      {activeTab === "links" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Objets métier QHSE rattachés (`document_links`)</h3>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setIsAddingLink(!isAddingLink)} className="gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Ajouter un lien métier
              </Button>
            )}
          </div>

          {isAddingLink && (
            <form onSubmit={handleAddLink} className="flex items-end gap-3 rounded-lg border border-border bg-card p-3">
              <div className="space-y-1 text-xs">
                <label className="font-medium text-foreground">Type d'entité</label>
                <select
                  value={linkEntityType}
                  onChange={(e) => setLinkEntityType(e.target.value)}
                  className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                >
                  <option value="work_permit">Permis de travail (PTW)</option>
                  <option value="audit">Audit</option>
                  <option value="inspection">Inspection</option>
                  <option value="risk">Analyse de risque</option>
                  <option value="incident">Incident</option>
                  <option value="action_corrective">Action CAPA</option>
                  <option value="equipment">Équipement</option>
                </select>
              </div>
              <div className="space-y-1 text-xs flex-1">
                <label className="font-medium text-foreground">ID de l'objet (UUID)</label>
                <input
                  type="text"
                  value={linkEntityId}
                  onChange={(e) => setLinkEntityId(e.target.value)}
                  placeholder="ID UUID de l'entité"
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                  required
                />
              </div>
              <Button type="submit" size="sm" disabled={isPending} className="h-8 text-xs">
                Lier
              </Button>
            </form>
          )}

          {links.length === 0 ? (
            <p className="text-xs text-muted-foreground rounded-lg border border-border p-4 bg-card">Aucun objet métier lié actuellement à ce document.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {links.map((link) => (
                <div key={link.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">{link.entityType}</p>
                      <p className="font-mono text-foreground">{link.entityId}</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">{link.relationshipType}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: History */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Journal d'audit immuable (`document_history`)</h3>
          <div className="relative border-l-2 border-border ml-3 space-y-6">
            {history.map((event) => (
              <div key={event.id} className="relative pl-6">
                <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                <div className="rounded-lg border border-border bg-card p-3 shadow-xs text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold uppercase tracking-wider text-[11px] text-primary">{event.eventType}</span>
                    <span className="text-muted-foreground text-[10px]">{new Date(event.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                  <p className="text-foreground">Par <span className="font-medium">{event.actorName}</span></p>
                  {event.details && (
                    <pre className="mt-1 rounded bg-muted/60 p-2 text-[10px] font-mono text-muted-foreground overflow-x-auto">
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Nouvelle Révision */}
      <CreateRevisionModal
        documentId={doc.id}
        documentTitle={doc.title}
        currentRevisionCode={doc.revisionCode || "REV00"}
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Modal Signature Écran */}
      {activeSignatureId && (
        <SignatureModal
          signatureId={activeSignatureId}
          documentId={doc.id}
          signerName="Signataire"
          isOpen={isSignatureModalOpen}
          onClose={() => {
            setIsSignatureModalOpen(false);
            setActiveSignatureId(null);
          }}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* Modal Importation Document Signé Papier */}
      {currentRevision && (
        <PaperSignedUploadModal
          documentId={doc.id}
          revisionId={currentRevision.id}
          revisionCode={currentRevision.revisionCode}
          isOpen={isPaperUploadModalOpen}
          onClose={() => setIsPaperUploadModalOpen(false)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
