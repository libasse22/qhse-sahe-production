"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorkPermit } from "@/lib/services/permits.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Equipment } from "@/lib/types/equipment";
import { PERMIT_TYPE_LABELS, type WorkPermitType, type SafetyMeasure } from "@/lib/types/permits";
import { ShieldAlert, Plus, Trash2 } from "lucide-react";

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

export function NewPermitForm({ equipmentList }: { equipmentList: Equipment[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [permitType, setPermitType] = useState<WorkPermitType>("hauteur");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(
    new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16),
  );

  const [customMeasureText, setCustomMeasureText] = useState("");
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

  function addCustomMeasure() {
    if (!customMeasureText.trim()) return;
    setMeasures((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        label: customMeasureText.trim(),
        checked: true,
      },
    ]);
    setCustomMeasureText("");
  }

  function removeMeasure(id: string) {
    setMeasures((prev) => prev.filter((m) => m.id !== id));
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
        equipmentId: equipmentId || undefined,
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

      <div className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor="equipmentId">Équipement ou Machine concerné (Optionnel)</Label>
          <Select
            id="equipmentId"
            value={equipmentId}
            onChange={(e) => setEquipmentId(e.target.value)}
          >
            <option value="">-- Aucun équipement spécifique --</option>
            {equipmentList.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name} ({eq.serialNumber || eq.category || "Sans code"})
              </option>
            ))}
          </Select>
        </div>
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

      {/* CHECKLIST ADAPTABLE DES MESURES DE SÉCURITÉ */}
      <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm text-primary">
            <ShieldAlert className="h-4 w-4" />
            Checklist des Consignes de Sécurité ({PERMIT_TYPE_LABELS[permitType]})
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {measures.filter((m) => m.checked).length} / {measures.length} requises
          </span>
        </div>

        <div className="space-y-2">
          {measures.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-md bg-card p-2 text-xs border border-border"
            >
              <label className="flex items-center gap-3 flex-1 cursor-pointer">
                <Checkbox
                  checked={m.checked}
                  onCheckedChange={() => toggleMeasure(m.id)}
                />
                <span className={m.checked ? "font-medium" : "text-muted-foreground line-through"}>
                  {m.label}
                </span>
              </label>
              <button
                type="button"
                onClick={() => removeMeasure(m.id)}
                className="text-muted-foreground hover:text-destructive p-1"
                title="Supprimer cette consigne"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* AJOUT DE CONSIGNE SUR-MESURE */}
        <div className="pt-2 flex gap-2">
          <Input
            value={customMeasureText}
            onChange={(e) => setCustomMeasureText(e.target.value)}
            placeholder="+ Ajouter une consigne spécifique sur-mesure pour ce permis..."
            className="text-xs h-9 bg-card"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomMeasure();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addCustomMeasure}
            disabled={!customMeasureText.trim()}
          >
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
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
  );
}
