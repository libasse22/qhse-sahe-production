"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { confirmLogo, createLogoUploadTarget, removeLogo } from "@/lib/services/settings.service";
import { Button } from "@/components/ui/button";

export function LogoUpload({ currentLogoUrl }: { currentLogoUrl: string | null }) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Seules les images sont acceptées.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo trop volumineux (2 Mo max).");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const target = await createLogoUploadTarget(file.name);
      if ("error" in target) {
        setError(target.error);
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("app-branding")
        .uploadToSignedUrl(target.path, target.token, file);

      if (uploadError) {
        setError("Échec de l'envoi du logo.");
        return;
      }

      const result = await confirmLogo(target.path);
      if (result.error) {
        setError(result.error);
        return;
      }

      setLogoUrl(URL.createObjectURL(file));
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeLogo();
      if (result.error) {
        setError(result.error);
      } else {
        setLogoUrl(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      {logoUrl ? (
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-card">
            <Image src={logoUrl} alt="Logo actuel" width={56} height={56} className="max-h-14 max-w-14 object-contain" unoptimized />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleRemove} disabled={isPending}>
            <Trash2 className="h-4 w-4" />
            Retirer le logo
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun logo — le nom de l&apos;application est affiché seul.</p>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4" />
        {isUploading ? "Envoi en cours…" : logoUrl ? "Changer le logo" : "Ajouter un logo"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
