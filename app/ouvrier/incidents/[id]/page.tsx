import { notFound } from "next/navigation";
import { CheckCircle2, AlertOctagon, AlertTriangle, Flame } from "lucide-react";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getIncidentById } from "@/lib/services/incidents.service";
import { listIncidentPhotos } from "@/lib/services/photos.service";
import { listIncidentVoiceNotes } from "@/lib/services/voice.service";
import { PhotoGallery } from "@/components/incidents/photo-gallery";
import { VoiceNotes } from "@/components/incidents/voice-notes";
import type { IncidentSeverity } from "@/lib/types/incidents";

const SEVERITY_ICON: Record<IncidentSeverity, { icon: typeof CheckCircle2; label: string; className: string }> = {
  faible: { icon: CheckCircle2, label: "Léger", className: "bg-emerald-100 text-emerald-700" },
  moyenne: { icon: AlertTriangle, label: "Moyen", className: "bg-amber-100 text-amber-700" },
  elevee: { icon: AlertOctagon, label: "Grave", className: "bg-orange-100 text-orange-700" },
  critique: { icon: Flame, label: "Urgence", className: "bg-red-100 text-red-700" },
};

export default async function OuvrierIncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const incident = await getIncidentById(id);

  if (!incident) notFound();

  const canUpload = incident.reportedBy === profile?.id;
  const { icon: Icon, label, className } = SEVERITY_ICON[incident.severity];

  const [photos, voiceNotes] = await Promise.all([
    listIncidentPhotos(id),
    listIncidentVoiceNotes(id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className={`flex h-16 w-16 items-center justify-center rounded-full ${className}`}>
          <Icon className="h-8 w-8" />
        </div>
        <p className="text-xl font-bold">{label}</p>
        <p className="text-muted-foreground">{incident.location || "Lieu non précisé"}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(incident.occurredAt).toLocaleString("fr-FR")}
        </p>
      </div>

      {incident.description && (
        <p className="rounded-xl bg-card p-4 text-base">{incident.description}</p>
      )}

      <div className="space-y-2">
        <p className="text-lg font-semibold">Photos</p>
        <PhotoGallery incidentId={id} initialPhotos={photos} canUpload={canUpload} large />
      </div>

      <div className="space-y-2">
        <p className="text-lg font-semibold">Message vocal</p>
        <VoiceNotes incidentId={id} initialNotes={voiceNotes} canRecord={canUpload} large />
      </div>
    </div>
  );
}
