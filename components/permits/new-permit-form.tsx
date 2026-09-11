"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorkPermit } from "@/lib/services/permits.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Equipment } from "@/lib/types/equipment";
import { PERMIT_TYPE_LABELS, type WorkPermitType, type SafetyMeasure } from "@/lib/types/permits";
import { DynamicPermitQuestionnaire } from "@/components/permits/dynamic-permit-questionnaire";
import { ShieldAlert, AlertCircle } from "lucide-react";

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

  // Dynamic Questionnaire & Safety Checklists States
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, any>>({});
  const [beforeMeasures, setBeforeMeasures] = useState<SafetyMeasure[]>([]);
  const [duringMeasures, setDuringMeasures] = useState<SafetyMeasure[]>([]);
  const [afterMeasures, setAfterMeasures] = useState<SafetyMeasure[]>([]);
  const [epiRequirements, setEpiRequirements] = useState<Record<string, boolean>>({});
  const [emergencyPlan, setEmergencyPlan] = useState("");
  const [hasBlockingItems, setHasBlockingItems] = useState(false);

  function handleTypeChange(newType: WorkPermitType) {
    setPermitType(newType);
    setQuestionnaireAnswers({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !location.trim()) {
      setError("Le titre et le lieu de l'intervention sont obligatoires.");
      return;
    }

    if (hasBlockingItems) {
      setError("🔴 BLOQUANT : Des éléments critiques ne sont pas conformes. Veuillez corriger les points bloquants avant d'autoriser ce permis.");
      return;
    }

    startTransition(async () => {
      // Combine safety measures for backwards compatibility
      const allMeasures = [...beforeMeasures, ...duringMeasures, ...afterMeasures];

      const res = await createWorkPermit({
        title,
        permitType,
        description,
        location,
        equipmentId: equipmentId || undefined,
        startTime,
        endTime,
        safetyMeasures: allMeasures,
        questionnaireAnswers,
        beforeMeasures,
        duringMeasures,
        afterMeasures,
        epiRequirements,
        emergencyPlan: emergencyPlan ? { text: emergencyPlan } : undefined,
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
      {/* 1. INFORMATIONS GÉNÉRALES ET IDENTIFICATION */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          Identification de l&apos;Intervention
        </h3>

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
      </div>

      {/* 2. QUESTIONNAIRE DYNAMIQUE & CHECKLISTS AVANT / PENDANT / APRÈS / EPI */}
      <DynamicPermitQuestionnaire
        permitType={permitType}
        onQuestionnaireChange={setQuestionnaireAnswers}
        onBeforeMeasuresChange={setBeforeMeasures}
        onDuringMeasuresChange={setDuringMeasures}
        onAfterMeasuresChange={setAfterMeasures}
        onEpiChange={setEpiRequirements}
        onEmergencyPlanChange={setEmergencyPlan}
        onBlockingStateChange={setHasBlockingItems}
      />

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 flex items-center gap-2 text-sm text-destructive font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Annuler
        </Button>
        <Button type="submit" disabled={isPending || hasBlockingItems} variant={hasBlockingItems ? "destructive" : "default"}>
          {isPending ? "Soumission en cours..." : hasBlockingItems ? "🔴 Bloqué - Points non conformes" : "Soumettre la demande"}
        </Button>
      </div>
    </form>
  );
}

