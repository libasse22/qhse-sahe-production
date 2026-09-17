"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Download,
  Trash2,
  Eye,
  Filter,
  RefreshCw,
  Tag,
  ExternalLink,
} from "lucide-react";
import type { QhseDocument, DocumentFolder, DocumentStatus, DocumentType, DomaineQhse } from "@/lib/types/document";
import { deleteDocument, listDocuments } from "@/lib/services/documents.service";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { DocumentFolderTree } from "@/components/documents/document-folder-tree";
import { CreateDocumentModal } from "@/components/documents/create-document-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DocumentLibrary({
  initialDocuments,
  folders,
  canManage,
}: {
  initialDocuments: QhseDocument[];
  folders: DocumentFolder[];
  canManage: boolean;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [domainFilter, setDomainFilter] = useState<DomaineQhse | "all">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Re-fetch client-side list when filters change
  async function refreshDocumentList(
    folderId = selectedFolderId,
    query = searchQuery,
    status = statusFilter,
    type = typeFilter,
    domain = domainFilter
  ) {
    const list = await listDocuments({
      folderId: folderId || undefined,
      searchQuery: query,
      status,
      documentType: type,
      domaineQhse: domain,
    });
    setDocuments(list);
  }

  function handleFolderSelect(folderId: string | null) {
    setSelectedFolderId(folderId);
    startTransition(() => {
      refreshDocumentList(folderId, searchQuery, statusFilter, typeFilter, domainFilter);
    });
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSearchQuery(q);
    startTransition(() => {
      refreshDocumentList(selectedFolderId, q, statusFilter, typeFilter, domainFilter);
    });
  }

  function handleDelete(doc: QhseDocument) {
    if (!confirm(`Confirmer la suppression du document "${doc.title}" ?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteDocument(doc.id, doc.storagePath);
      if (result.error) {
        setError(result.error);
      } else {
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Unified Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">GED Enterprise — Bibliothèque Documentaire</h2>
            <p className="text-xs text-muted-foreground">Gestion centralisée des procédures, politiques et enregistrements QHSE</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/documents/registre">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5 text-sky-600" />
              Registre Documentaire ISO 7.5
            </Button>
          </Link>

          {canManage && (
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="gap-1.5 text-xs">
              <Plus className="h-4 w-4" />
              Nouveau document
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Main Layout: Left Folder Tree / Right Document List */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column: Folders */}
        <div className="lg:col-span-1">
          <DocumentFolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleFolderSelect}
            canManage={canManage}
          />
        </div>

        {/* Right Column: Search, Filters & Document Table */}
        <div className="space-y-4 lg:col-span-3">
          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-3 shadow-sm md:grid-cols-4">
            <div className="relative md:col-span-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Rechercher par titre, code..."
                className="pl-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 md:col-span-3">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

              {/* Statut Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  const val = e.target.value as DocumentStatus | "all";
                  setStatusFilter(val);
                  refreshDocumentList(selectedFolderId, searchQuery, val, typeFilter, domainFilter);
                }}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="all">Tous statuts</option>
                <option value="en_vigueur">En vigueur</option>
                <option value="brouillon">Brouillon</option>
                <option value="en_revue">En revue</option>
                <option value="en_attente_signature">Attente Signature</option>
                <option value="approuve">Approuvé</option>
                <option value="obsolete">Obsolète</option>
                <option value="archive">Archivé</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => {
                  const val = e.target.value as DocumentType | "all";
                  setTypeFilter(val);
                  refreshDocumentList(selectedFolderId, searchQuery, statusFilter, val, domainFilter);
                }}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="all">Tous types</option>
                <option value="procedure">Procédure</option>
                <option value="politique">Politique</option>
                <option value="instruction">Instruction</option>
                <option value="formulaire">Formulaire</option>
                <option value="permis">Permis</option>
                <option value="rapport">Rapport</option>
                <option value="audit">Audit</option>
                <option value="inspection">Checklist / Inspection</option>
                <option value="manuel">Manuel</option>
                <option value="autre">Autre</option>
              </select>

              {/* Domaine Filter */}
              <select
                value={domainFilter}
                onChange={(e) => {
                  const val = e.target.value as DomaineQhse | "all";
                  setDomainFilter(val);
                  refreshDocumentList(selectedFolderId, searchQuery, statusFilter, typeFilter, val);
                }}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="all">Tous domaines</option>
                <option value="securite">Sécurité (HSE)</option>
                <option value="environnement">Environnement (ENV)</option>
                <option value="qualite">Qualité (QUAL)</option>
                <option value="sante">Santé (SAN)</option>
                <option value="hygiene">Hygiène (HYG)</option>
                <option value="general">Général (QHSE)</option>
              </select>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setDomainFilter("all");
                  setSelectedFolderId(null);
                  refreshDocumentList(null, "", "all", "all", "all");
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Document Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {documents.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-medium text-foreground">Aucun document ne correspond à vos critères.</p>
                <p className="text-xs text-muted-foreground mt-1">Essayez de réinitialiser vos filtres ou de créer un document.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Code / Révision</th>
                      <th className="px-4 py-3">Titre</th>
                      <th className="px-4 py-3">Type & Domaine</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {documents.map((doc) => {
                      const displayCode = doc.codeReference
                        ? `${doc.codeReference}-${doc.revisionCode || "REV00"}`
                        : `DOC-${doc.revisionCode || "REV00"}`;

                      return (
                        <tr key={doc.id} className="group hover:bg-muted/30 transition-colors">
                          {/* Code & Révision */}
                          <td className="px-4 py-3 font-mono font-semibold text-primary whitespace-nowrap">
                            <Link href={`/documents/${doc.id}`} className="hover:underline flex items-center gap-1.5">
                              {displayCode}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </td>

                          {/* Titre */}
                          <td className="px-4 py-3">
                            <Link href={`/documents/${doc.id}`} className="font-medium text-foreground hover:text-primary">
                              {doc.title}
                            </Link>
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {doc.tags.map((t, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                                    <Tag className="h-2.5 w-2.5" />
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Type & Domaine */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="capitalize font-medium text-foreground">{doc.documentType || doc.category}</span>
                            <span className="text-muted-foreground uppercase text-[10px] ml-1.5 px-1 bg-muted rounded">
                              {doc.domaineQhse || "HSE"}
                            </span>
                          </td>

                          {/* Statut */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <DocumentStatusBadge status={doc.status} />
                          </td>

                          {/* Dates */}
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            <div>Vigueur: {doc.effectiveDate ? new Date(doc.effectiveDate).toLocaleDateString("fr-FR") : new Date(doc.createdAt).toLocaleDateString("fr-FR")}</div>
                            {doc.expiryDate && <div className="text-[10px] text-amber-600">Exp: {new Date(doc.expiryDate).toLocaleDateString("fr-FR")}</div>}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/documents/${doc.id}`}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-accent"
                                title="Voir la fiche détaillée"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              {doc.url && (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-accent"
                                  title="Télécharger le fichier"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(doc)}
                                  disabled={isPending}
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Création Document */}
      <CreateDocumentModal
        folders={folders}
        defaultFolderId={selectedFolderId}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refreshDocumentList();
        }}
      />
    </div>
  );
}
