"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, X, FileText, Tag, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createDocumentUploadTarget, createDocument } from "@/lib/services/documents.service";
import type { DocumentFolder, DocumentType, DomaineQhse, DocumentOrigin } from "@/lib/types/document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateDocumentModal({
  folders,
  defaultFolderId,
  isOpen,
  onClose,
  onSuccess,
}: {
  folders: DocumentFolder[];
  defaultFolderId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("procedure");
  const [domaineQhse, setDomaineQhse] = useState<DomaineQhse>("securite");
  const [originType, setOriginType] = useState<DocumentOrigin>("interne");
  const [externalSource, setExternalSource] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [externalDocumentDate, setExternalDocumentDate] = useState("");
  const [externalReceivedDate, setExternalReceivedDate] = useState("");
  const [folderId, setFolderId] = useState<string>(defaultFolderId || "");
  const [tagsInput, setTagsInput] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [retentionYears] = useState<string>("5");
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Veuillez sélectionner un fichier à déposer.");
      return;
    }
    if (!title.trim()) {
      setError("Veuillez renseigner un titre pour le document.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // 1. Target URL d'upload sécurisé
      const target = await createDocumentUploadTarget(file.name);
      if ("error" in target) {
        setError(target.error);
        setIsUploading(false);
        return;
      }

      // 2. Upload binaire Supabase Storage
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("qhse-documents")
        .uploadToSignedUrl(target.path, target.token, file);

      if (uploadError) {
        setError("Échec du transfert du fichier vers le storage sécurisé.");
        setIsUploading(false);
        return;
      }

      // 3. Enregistrement BDD et génération transactionnelle du code reference + REV00
      startTransition(async () => {
        const tags = tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

        const result = await createDocument({
          title: title.trim(),
          category: documentType,
          documentType,
          domaineQhse,
          storagePath: target.path,
          folderId: folderId || null,
          originalFilename: file.name,
          fileType: file.type,
          fileSize: file.size,
          tags,
          effectiveDate: effectiveDate || null,
          reviewDate: reviewDate || null,
          expiryDate: expiryDate || null,
          originType,
          externalSource: originType === "externe" ? externalSource.trim() || null : null,
          externalReference: originType === "externe" ? externalReference.trim() || null : null,
          externalDocumentDate: originType === "externe" ? externalDocumentDate || null : null,
          externalReceivedDate: originType === "externe" ? externalReceivedDate || null : null,
          retentionDurationYears: retentionYears ? parseInt(retentionYears, 10) : null,
          retentionUnit: "ans",
        });

        setIsUploading(false);

        if (result.error) {
          setError(result.error);
        } else {
          onSuccess();
          onClose();
        }
      });
    } catch {
      setError("Une erreur inattendue s'est produite lors de la création.");
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Nouveau Document GED</h2>
              <p className="text-xs text-muted-foreground">La codification (ex: PRO-HSE-001) et REV00 sont générées automatiquement</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Sélection Fichier */}
          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Fichier principal *</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/50"
              }`}
            >
              <Upload className={`h-6 w-6 mb-1 ${file ? "text-primary" : "text-muted-foreground"}`} />
              {file ? (
                <p className="font-medium text-foreground">{file.name} <span className="text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span></p>
              ) : (
                <p className="text-muted-foreground">Cliquez ou glissez-déposez le fichier (PDF, Word, Excel, Image)</p>
              )}
            </div>
          </div>

          {/* Titre */}
          <div className="space-y-1">
            <label className="font-medium text-foreground">Titre du document *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Procédure d'intervention en espace confiné ou Norme ISO 9001:2015"
              className="text-xs"
              required
            />
          </div>

          {/* Origine du Document ISO 7.5 */}
          <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <label className="font-semibold text-foreground text-xs">Origine Documentaire *</label>
              <select
                value={originType}
                onChange={(e) => setOriginType(e.target.value as DocumentOrigin)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="interne">Document d'origine Interne</option>
                <option value="externe">Document d'origine Externe (ISO 7.5)</option>
              </select>
            </div>

            {originType === "externe" && (
              <div className="space-y-1">
                <label className="font-semibold text-foreground text-xs">Organisme / Émetteur *</label>
                <Input
                  value={externalSource}
                  onChange={(e) => setExternalSource(e.target.value)}
                  placeholder="ex: ISO, AFNOR, Bureau Veritas..."
                  className="text-xs"
                  required={originType === "externe"}
                />
              </div>
            )}
          </div>

          {/* Métadonnées Spécifiques Document Externe */}
          {originType === "externe" && (
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/50 space-y-3">
              <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                Spécifications Document Externe (Circuit de vérification obligatoire)
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-slate-700 dark:text-slate-300">Réf. Externe</label>
                  <Input
                    value={externalReference}
                    onChange={(e) => setExternalReference(e.target.value)}
                    placeholder="ex: NF EN 1337"
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-slate-700 dark:text-slate-300">Date du doc</label>
                  <Input
                    type="date"
                    value={externalDocumentDate}
                    onChange={(e) => setExternalDocumentDate(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-slate-700 dark:text-slate-300">Réception</label>
                  <Input
                    type="date"
                    value={externalReceivedDate}
                    onChange={(e) => setExternalReceivedDate(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Type & Domaine */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-foreground">Type de document</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
              >
                <option value="procedure">Procédure (PRO)</option>
                <option value="politique">Politique (POL)</option>
                <option value="instruction">Instruction (INS)</option>
                <option value="formulaire">Formulaire (FOR)</option>
                <option value="permis">Permis de travail (PER)</option>
                <option value="rapport">Rapport (REP)</option>
                <option value="audit">Audit (AUD)</option>
                <option value="inspection">Inspection / Checklist (CHK)</option>
                <option value="manuel">Manuel (MAN)</option>
                <option value="autre">Autre (DOC)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Domaine QHSE</label>
              <select
                value={domaineQhse}
                onChange={(e) => setDomaineQhse(e.target.value as DomaineQhse)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
              >
                <option value="securite">Sécurité (HSE)</option>
                <option value="environnement">Environnement (ENV)</option>
                <option value="qualite">Qualité (QUAL)</option>
                <option value="sante">Santé (SAN)</option>
                <option value="hygiene">Hygiène (HYG)</option>
                <option value="general">Général (QHSE)</option>
              </select>
            </div>
          </div>

          {/* Dossier */}
          <div className="space-y-1">
            <label className="font-medium text-foreground">Dossier de classement</label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
            >
              <option value="">Aucun (Racine)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.codePrefix ? `[${f.codePrefix}] ` : ""}{f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dates d'effet, revue et d'expiration */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="flex items-center gap-1 font-medium text-foreground">
                <Calendar className="h-3 w-3 text-muted-foreground" /> En vigueur
              </label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1 font-medium text-foreground">
                <Calendar className="h-3 w-3 text-muted-foreground" /> Date revue
              </label>
              <Input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1 font-medium text-foreground">
                <Calendar className="h-3 w-3 text-muted-foreground" /> Expiration
              </label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 font-medium text-foreground">
              <Tag className="h-3 w-3 text-muted-foreground" /> Tags (séparés par des virgules)
            </label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="epi, travail-hauteur, iso9001"
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isUploading || isPending}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={isUploading || isPending}>
              {isUploading || isPending ? "Création & Codification..." : "Enregistrer Document"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
