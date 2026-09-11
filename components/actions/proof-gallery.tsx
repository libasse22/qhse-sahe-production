"use client";

import { useEffect, useState } from "react";
import { Camera, Image as ImageIcon, Trash2 } from "lucide-react";
import { listSituationProofs, confirmSituationProof, deleteSituationProof, type SituationProof, type ProofStage } from "@/lib/services/proofs.service";
import { createUploadTarget } from "@/lib/services/photos.service";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProofGalleryProps {
  actionId?: string;
  incidentId?: string;
  workPermitId?: string;
}

const STAGE_CONFIG: Record<ProofStage, { title: string; badgeVariant: "destructive" | "warning" | "success"; description: string }> = {
  avant: {
    title: "AVANT",
    badgeVariant: "destructive",
    description: "Constat du danger ou dysfonctionnement initial",
  },
  pendant: {
    title: "PENDANT",
    badgeVariant: "warning",
    description: "Mise en place des travaux de correction",
  },
  apres: {
    title: "APRÈS",
    badgeVariant: "success",
    description: "Situation sécurisée et conforme",
  },
};

export function ProofGallery({ actionId, incidentId, workPermitId }: ProofGalleryProps) {
  const [proofs, setProofs] = useState<SituationProof[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadProofs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionId, incidentId, workPermitId]);

  async function loadProofs() {
    const data = await listSituationProofs({ actionId, incidentId, workPermitId });
    setProofs(data);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, stage: ProofStage) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      const target = await createUploadTarget(actionId ?? incidentId ?? workPermitId ?? "general", file.name);
      if ("error" in target) throw new Error(target.error);

      const supabase = createClient();
      const { error: uploadErr } = await supabase.storage
        .from("incident-photos")
        .uploadToSignedUrl(target.path, target.token, file);

      if (uploadErr) throw new Error("Échec upload Supabase Storage");

      await confirmSituationProof({
        actionId,
        incidentId,
        workPermitId,
        stage,
        storagePath: target.path,
        caption: `Preuve ${stage.toUpperCase()}`,
      });

      await loadProofs();
    } catch {
      alert("Impossible de télécharger le fichier de preuve.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(proofId: string, storagePath: string) {
    if (!confirm("Supprimer cette preuve justificative ?")) return;
    const res = await deleteSituationProof(proofId, storagePath);
    if (res.error) {
      alert(res.error);
    } else {
      await loadProofs();
    }
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Preuves Terrain (AVANT / PENDANT / APRÈS)
          </CardTitle>
          <Badge variant="outline" className="text-xs font-semibold">
            {proofs.length} Preuve(s) enregistrée(s)
          </Badge>
        </div>
        <CardDescription>
          Pièces justificatives recevables (photos, vidéos, documents) attestant de la réalisation conforme.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {(["avant", "pendant", "apres"] as ProofStage[]).map((stage) => {
            const config = STAGE_CONFIG[stage];
            const stageProofs = proofs.filter((p) => p.stage === stage);

            return (
              <div key={stage} className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <Badge variant={config.badgeVariant} className="font-bold">
                    {config.title}
                  </Badge>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,video/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, stage)}
                      disabled={isUploading}
                    />
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" asChild>
                      <span>
                        <Camera className="h-3.5 w-3.5" /> Ajouter
                      </span>
                    </Button>
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground">{config.description}</p>

                {stageProofs.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border bg-background/50 text-[11px] text-muted-foreground">
                    Aucune preuve ({stage})
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stageProofs.map((p) => (
                      <div key={p.id} className="relative group overflow-hidden rounded-md border border-border aspect-video bg-black">
                        {p.url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.url} alt="" className="h-full w-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between text-white">
                          <span className="text-[10px] truncate">{p.uploadedByName || "Inconnu"}</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.storagePath)}
                            className="self-end rounded-full bg-red-600 p-1 text-white hover:bg-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
