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
import {
  PERMIT_TYPE_LABELS,
  type WorkPermitType,
  type SafetyMeasure,
  type WorkPermitTemplate,
  type WorkPermitTemplateSnapshot,
} from "@/lib/types/permits";
import { DEFAULT_TEMPLATE_SNAPSHOT } from "@/lib/constants/permit-questionnaires";
import { DynamicPermitQuestionnaire } from "@/components/permits/dynamic-permit-questionnaire";
import { ShieldAlert, AlertCircle, Layers } from "lucide-react";

export function NewPermitForm({
  equipmentList,
  availableTemplates = [],
}: {
  equipmentList: Equipment[];
  availableTemplates?: WorkPermitTemplate[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultActiveTemplate =
    availableTemplates.find((t) => t.isDefault && t.status === "actif") || availableTemplates[0];

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    defaultActiveTemplate?.id || "default"
  );

  const activeTemplate = availableTemplates.find((t) => t.id === selectedTemplateId);
  const selectedTemplateSnapshot: WorkPermitTemplateSnapshot =
    activeTemplate?.activeVersion?.configuration || DEFAULT_TEMPLATE_SNAPSHOT;

  const enabledTypes: WorkPermitType[] =
    selectedTemplateSnapshot.enabledPermitTypes || Object.keys(PERMIT_TYPE_LABELS) as WorkPermitType[];

  const [permitType, setPermitType] = useState<WorkPermitType>(
    enabledTypes[0] || "hauteur"
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [contractorCompany, setContractorCompany] = useState("");
  const [contractorContactName, setContractorContactName] = useState("");
  const [contractorContactPhone, setContractorContactPhone] = useState("");
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(
    new Date(Date.now() + (selectedTemplateSnapshot.maxValidityHours || 8) * 3600 * 1000)
      .toISOString()
      .slice(0, 16)
  );

  // Dynamic Questionnaire & Safety Checklists States
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, any>>({});
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, any>>({});
  const [beforeMeasures, setBeforeMeasures] = useState<SafetyMeasure[]>([]);
  const [duringMeasures, setDuringMeasures] = useState<SafetyMeasure[]>([]);
  const [afterMeasures, setAfterMeasures] = useState<SafetyMeasure[]>([]);
  const [epiRequirements, setEpiRequirements] = useState<Record<string, boolean>>({});
  const [emergencyPlan, setEmergencyPlan] = useState("");
  const [hasBlockingItems, setHasBlockingItems] = useState(false);

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId);
    const tmpl = availableTemplates.find((t) => t.id === templateId);
    const snap = tmpl?.activeVersion?.configuration || DEFAULT_TEMPLATE_SNAPSHOT;
    const types = snap.enabledPermitTypes || (Object.keys(PERMIT_TYPE_LABELS) as WorkPermitType[]);

    if (!types.includes(permitType)) {
      setPermitType(types[0] || "hauteur");
    }
    setQuestionnaireAnswers({});
    setCustomFieldsData({});
  }

  function handleTypeChange(newType: WorkPermitType) {
    setPermitType(newType);
    setQuestionnaireAnswers({});
    setCustomFieldsData({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !location.trim()) {
      setError("Le titre et le lieu de l'intervention sont obligatoires.");
      return;
    }

    if (hasBlockingItems) {
      setError(
        "🔴 BLOQUANT : Des éléments critiques ne sont pas conformes. Veuillez corriger les points bloquants avant d'autoriser ce permis."
      );
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
        contractorCompany: contractorCompany.trim() || undefined,
        contractorContactName: contractorContactName.trim() || undefined,
        contractorContactPhone: contractorContactPhone.trim() || undefined,
        equipmentId: equipmentId || undefined,
        startTime,
        endTime,
        safetyMeasures: allMeasures,
        questionnaireAnswers,
        customFieldsData,
        beforeMeasures,
        duringMeasures,
        afterMeasures,
        epiRequirements,
        emergencyPlan: emergencyPlan ? { text: emergencyPlan } : undefined,
        templateId: selectedTemplateId === "default" ? undefined : selectedTemplateId,
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
          Identification & Référentiel de l&apos;Intervention
        </h3>

        <div className="space-y-2">
          <Label htmlFor="templateSelect" className="flex items-center gap-1.5 font-medium">
            <Layers className="h-4 w-4 text-primary" /> Référentiel de permis de travail
          </Label>
          <select
            id="templateSelect"
            value={selectedTemplateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="default">QHSE Duo — Référentiel Standard (v1.0)</option>
            {availableTemplates
              .filter((t) => t.status === "actif")
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.activeVersion ? t.activeVersion.versionLabel : `v${t.versionMajor}.${t.versionMinor}`})
                </option>
              ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="permitType">Type de travaux à haut risque</Label>
            <Select
              id="permitType"
              value={permitType}
              onChange={(e) => handleTypeChange(e.target.value as WorkPermitType)}
            >
              {enabledTypes.map((val) => (
                <option key={val} value={val}>
                  {PERMIT_TYPE_LABELS[val] || val}
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

        <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t border-border">
          <div className="space-y-2">
            <Label htmlFor="contractorCompany">Entreprise Extérieure (EE) / Prestataire</Label>
            <Input
              id="contractorCompany"
              value={contractorCompany}
              onChange={(e) => setContractorCompany(e.target.value)}
              placeholder="Nom de l'entreprise sous-traitante..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractorContactName">Contact d'urgence EE / Responsable</Label>
            <Input
              id="contractorContactName"
              value={contractorContactName}
              onChange={(e) => setContractorContactName(e.target.value)}
              placeholder="Nom & prénom du contact..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractorContactPhone">Téléphone d'urgence EE</Label>
            <Input
              id="contractorContactPhone"
              value={contractorContactPhone}
              onChange={(e) => setContractorContactPhone(e.target.value)}
              placeholder="+221 77..."
            />
          </div>
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
        templateSnapshot={selectedTemplateSnapshot}
        onQuestionnaireChange={setQuestionnaireAnswers}
        onCustomFieldsDataChange={setCustomFieldsData}
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

