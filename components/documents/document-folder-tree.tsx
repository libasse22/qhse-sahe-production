"use client";

import { useState, useTransition } from "react";
import { Folder, FolderPlus, FolderOpen, Layers } from "lucide-react";
import type { DocumentFolder } from "@/lib/types/document";
import { createDocumentFolder } from "@/lib/services/documents.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DocumentFolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  canManage,
}: {
  folders: DocumentFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  canManage: boolean;
}) {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderPrefix, setNewFolderPrefix] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setError(null);
    startTransition(async () => {
      const res = await createDocumentFolder(newFolderName.trim(), selectedFolderId, "", newFolderPrefix.trim());
      if (res.error) {
        setError(res.error);
      } else {
        setNewFolderName("");
        setNewFolderPrefix("");
        setIsCreatingFolder(false);
      }
    });
  }

  // Pre-configured default folders fallback if BDD folders are not initialized yet
  const defaultFolderCategories = [
    { code: "01", name: "Système QHSE" },
    { code: "02", name: "Sécurité" },
    { code: "03", name: "Environnement" },
    { code: "04", name: "Audits" },
    { code: "05", name: "Formation" },
    { code: "06", name: "Certifications" },
    { code: "07", name: "Technique" },
    { code: "08", name: "Administratif" },
  ];

  const displayFolders = folders.length > 0 ? folders : defaultFolderCategories.map((f, idx) => ({
    id: `default-${idx}`,
    name: f.name,
    codePrefix: f.code,
    sortOrder: idx + 1,
    createdAt: new Date().toISOString(),
  }));

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <Layers className="h-4 w-4 text-primary" />
          Dossiers GED
        </h3>
        {canManage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setIsCreatingFolder(!isCreatingFolder)}
          >
            <FolderPlus className="h-3.5 w-3.5 mr-1" />
            Nouveau
          </Button>
        )}
      </div>

      {isCreatingFolder && (
        <form onSubmit={handleCreateFolder} className="space-y-2 rounded-lg border border-border/80 bg-muted/40 p-2.5">
          <p className="text-xs font-medium text-foreground">Créer un dossier</p>
          <div className="grid gap-2">
            <Input
              value={newFolderPrefix}
              onChange={(e) => setNewFolderPrefix(e.target.value)}
              placeholder="Code (ex: 09)"
              className="h-7 text-xs"
            />
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nom du dossier"
              className="h-7 text-xs"
              required
            />
          </div>
          {error && <p className="text-[11px] text-destructive">{error}</p>}
          <div className="flex justify-end gap-1.5 pt-1">
            <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={() => setIsCreatingFolder(false)}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="h-6 text-[11px] px-2">
              {isPending ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      )}

      <nav className="space-y-1">
        <button
          type="button"
          onClick={() => onSelectFolder(null)}
          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
            selectedFolderId === null
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <FolderOpen className="h-3.5 w-3.5" />
            Tous les documents
          </span>
        </button>

        {displayFolders.map((folder) => {
          const isSelected = selectedFolderId === folder.id;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground font-normal"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Folder className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary-foreground" : "text-amber-500"}`} />
                {folder.codePrefix && (
                  <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? "bg-primary-foreground/20 text-white" : "bg-muted text-muted-foreground"}`}>
                    {folder.codePrefix}
                  </span>
                )}
                <span className="truncate">{folder.name}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
