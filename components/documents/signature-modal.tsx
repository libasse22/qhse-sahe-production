"use client";

import { useRef, useState, useTransition } from "react";
import { PenTool, X, RotateCcw, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createDocumentUploadTarget, executeDocumentSignature } from "@/lib/services/documents.service";
import { Button } from "@/components/ui/button";

export function SignatureModal({
  signatureId,
  documentId,
  signerName,
  isOpen,
  onClose,
  onSuccess,
}: {
  signatureId: string;
  documentId: string;
  signerName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function handleSaveSignature() {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      setError("Veuillez signer dans le cadre avant de valider.");
      return;
    }

    setError(null);
    setIsUploading(true);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setError("Erreur d'extraction de l'image de signature.");
        setIsUploading(false);
        return;
      }

      const filename = `sig-${Date.now()}.png`;
      const target = await createDocumentUploadTarget(filename);
      if ("error" in target) {
        setError(target.error);
        setIsUploading(false);
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("qhse-documents")
        .uploadToSignedUrl(target.path, target.token, blob);

      if (uploadError) {
        setError("Échec d'enregistrement de l'image de signature dans le Storage.");
        setIsUploading(false);
        return;
      }

      startTransition(async () => {
        const res = await executeDocumentSignature({
          signatureId,
          documentId,
          signatureStoragePath: target.path,
        });

        setIsUploading(false);

        if (res.error) {
          setError(res.error);
        } else {
          onSuccess();
          onClose();
        }
      });
    }, "image/png");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Émargement / Signature Numérique</h2>
              <p className="text-xs text-muted-foreground">Signataire : {signerName}</p>
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

        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Dessinez votre signature dans le cadre ci-dessous :</p>
          <div className="relative rounded-lg border-2 border-dashed border-border bg-slate-50 dark:bg-slate-900/50 p-1">
            <canvas
              ref={canvasRef}
              width={380}
              height={160}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full cursor-crosshair touch-none rounded bg-transparent"
            />
            {!hasSignature && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/50 select-none">
                Signez ici avec votre doigt ou la souris
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button type="button" variant="ghost" size="sm" onClick={clearCanvas} className="text-xs text-muted-foreground gap-1">
            <RotateCcw className="h-3.5 w-3.5" />
            Effacer
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isUploading || isPending} className="text-xs">
              Annuler
            </Button>
            <Button type="button" size="sm" onClick={handleSaveSignature} disabled={!hasSignature || isUploading || isPending} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
              <Check className="h-3.5 w-3.5" />
              {isUploading || isPending ? "Validation..." : "Valider Signature"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
