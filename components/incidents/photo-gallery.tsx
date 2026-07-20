"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  confirmIncidentPhoto,
  createUploadTarget,
  deleteIncidentPhoto,
} from "@/lib/services/photos.service";
import { Button } from "@/components/ui/button";
import type { IncidentPhoto } from "@/lib/types/incidents";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 Mo

export function PhotoGallery({
  incidentId,
  initialPhotos,
  canUpload,
  large = false,
}: {
  incidentId: string;
  initialPhotos: IncidentPhoto[];
  canUpload: boolean;
  /** Mode "large" : gros bouton tactile pour l'interface Ouvrier. */
  large?: boolean;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
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
    if (file.size > MAX_FILE_SIZE) {
      setError("Image trop volumineuse (8 Mo max).");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const target = await createUploadTarget(incidentId, file.name);
      if ("error" in target) {
        setError(target.error);
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("incident-photos")
        .uploadToSignedUrl(target.path, target.token, file);

      if (uploadError) {
        setError("Échec de l'envoi de la photo.");
        return;
      }

      const result = await confirmIncidentPhoto(incidentId, target.path);
      if (result.error) {
        setError(result.error);
        return;
      }

      setPhotos((prev) => [
        {
          id: target.path,
          incidentId,
          storagePath: target.path,
          uploadedBy: "",
          createdAt: new Date().toISOString(),
          url: URL.createObjectURL(file),
        },
        ...prev,
      ]);
    } finally {
      setIsUploading(false);
    }
  }

  function handleDelete(photo: IncidentPhoto) {
    setError(null);
    startTransition(async () => {
      const result = await deleteIncidentPhoto(photo.id, incidentId, photo.storagePath);
      if (result.error) {
        setError(result.error);
      } else {
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      }
    });
  }

  return (
    <div className="space-y-3">
      {canUpload && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            size={large ? "lg" : "sm"}
            variant="outline"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className={large ? "h-16 w-full text-lg" : ""}
          >
            <Upload className={large ? "h-6 w-6" : "h-4 w-4"} />
            {isUploading ? "Envoi en cours…" : "Prendre / ajouter une photo"}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune photo jointe.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-md border border-border">
              {photo.url && (
                <Image src={photo.url} alt="Photo de l'incident" fill className="object-cover" unoptimized />
              )}
              <button
                type="button"
                onClick={() => handleDelete(photo)}
                disabled={isPending}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
                aria-label="Supprimer la photo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
