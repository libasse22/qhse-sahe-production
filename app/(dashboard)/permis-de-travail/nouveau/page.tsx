"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorkPermit } from "@/lib/services/permits.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PERMIT_TYPE_LABELS, type WorkPermitType, type SafetyMeasure } from "@/lib/types/permits";
import { FileCheck, ShieldAlert, ArrowLeft } from "lucide-react";

const DEFAULT_SAFETY_CHECKLIST: Record<WorkPermitType, string[]> = {
  hauteur: [
    "Harnais de sécurité certifié et vérifié",
    "Point d'ancrage conforme (ligne de vie ou structure)",
    "Port du casque avec jugulaire",
    "Balisage et zone d'exclusion au sol",
    "Échafaudage ou Nacelle réceptionné",
  ],
  point_chaud: [
    "Permis de feu signé préalable",
    "Extincteur approprié à proximité immédiate (6kg poudre/CO2)",
    "Dégagement de tout matériau inflammable dans un rayon de 10m",
    "Écrans / Bâches ignifugées en place",
    "Ronde de sécurité 2h après fin des travaux",
  ],
  espace_confine: [
    "Mesure d'atmosphère préalable (O2, H2S, LEL, CO)",
    "Ventilation mécanique continue",
    "Surveillant de surface dédié en permanence",
    "Moyen d'extraction / Trépied de sauvetage prêt",
    "EPI respiratoires autonomes si requis",
  ],
  electrique: [
    "Vérification de l'absence de tension (VAT)",
    "Consignation / Cadenassage (LOTO) effectué",
    "Outillage isolé 1000V",
    "Gants isolants et écran facial anti-arc",
    "Balisage de la zone de risque électrique",
  ],
  fouille: [
    "Détection préalable de réseaux enterrés (Électricité, Gaz, Eau)",
    "Blindage / Étaiement des parois de tranchée (>1.30m)",
    "Moyen d'accès / Échelle de sortie tous les 7.5m",
    "Dépôt des déblais à plus d'1m du bord",
  ],
  chimique: [
    "Fiche de Données de Sécurité (FDS) disponible",
    "Gants étanches et combinaison anti-acide/solvant",
    "Masque avec cartouche filtrante adaptée",
    "Bassin de rétention et kit anti-pollution à proximité",
    "Lave-œil / Douche de sécurité opérationnel",
  ],
  autre: [
    "Analyse de Risques de la Tâche (ART) réalisée",
    "Port des EPI de base (Casque, Chaussures, Gilet)",
    "Balisage et information des équipes environnantes",
  ],
};

export default function NewWorkPermitPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [permitType, setPermitType] = useState<WorkPermitType>("hauteur");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(
    new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16),
  );

  const [measures, setMeasures] = useState<SafetyMeasure[]>(() =>
    DEFAULT_SAFETY_CHECKLIST.hauteur.map((label, idx) => ({
      id: `m-${idx}`,
      label,
      checked: true,
    })),
  );

  function handleTypeChange(newType: WorkPermitType) {
    setPermitType(newType);
    const defaults = DEFAULT_SAFETY_CHECKLIST[newType] || DEFAULT_SAFETY_CHECKLIST.autre;
    setMeasures(
      defaults.map((label, idx) => ({
        id: `m-${idx}`,
        label,
        checked: true,
      })),
    );
  }

  function toggleMeasure(id: string) {
    setMeasures((prev) =>
      prev.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m)),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !location.trim()) {
      setError("Le titre et le lieu de l'intervention sont obligatoires.");
      return;
    }

    startTransition(async () => {
      const res = await createWorkPermit({
        title,
        permitType,
        description,
        location,
        startTime,
        endTime,
        safetyMeasures: measures,
      });

      if (res.error) {
        setError(res.error);
      } else if (res.permitId) {
        router.push(`/permis-de-travail/${res.permitId}`);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Demande de Permis de Travail (PtW)
          </h1>
          <p className="text-xs text-muted-foreground">
            Formulaire de sécurité préalable aux interventions à risques élevés.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="permitType">Type de travaux à haut risque</Label>
                <Select
                  id="permitType"
                  value={permitType}
                  onChange={(e) => handleTypeChange(e.target.value as WorkPermitType)}
                >
                  {Object.entries(PERMIT_TYPE_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>
                      {lbl}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Lieu précis de l&apos;intervention</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex : Toiture Bâtiment B, Atelier Chaudronnerie..."
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre / Objet du permis</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Réparation étanchéité toiture / Soudure tuyauterie vapeur"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description détaillée des opérations</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détail des tâches, outillages utilisés, équipe impliquée..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Date & Heure de Début</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Date & Heure d&apos;Échéance</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* CHECKLIST DES MESURES DE SÉCURITÉ ET PRÉVENTION */}
            <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 font-semibold text-sm text-primary">
                <ShieldAlert className="h-4 w-4" />
                Checklist des Mesures de Prévention Obligatoires ({PERMIT_TYPE_LABELS[permitType]})
              </div>
              <div className="space-y-2">
                {measures.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 rounded-md bg-card p-2 text-xs border border-border cursor-pointer hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={m.checked}
                      onCheckedChange={() => toggleMeasure(m.id)}
                    />
                    <span className={m.checked ? "font-medium" : "text-muted-foreground line-through"}>
                      {m.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Soumission en cours..." : "Soumettre la demande"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
