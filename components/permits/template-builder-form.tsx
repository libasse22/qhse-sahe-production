"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createWorkPermitTemplate,
  updateWorkPermitTemplateDraft,
  publishTemplateVersion,
} from "@/lib/services/permit-templates.service";
import { DEFAULT_TEMPLATE_SNAPSHOT } from "@/lib/constants/permit-questionnaires";
import type {
  WorkPermitTemplate,
  WorkPermitTemplateSnapshot,
  WorkPermitType,
  QuestionnaireQuestion,
  SafetyMeasure,
  CustomSectionConfig,
  CustomFieldConfig,
  CustomColumnConfig,
} from "@/lib/types/permits";
import { PERMIT_TYPE_LABELS } from "@/lib/types/permits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Rocket,
  ArrowLeft,
  Settings,
  HelpCircle,
  HardHat,
  Clock,
  Layers,
  FolderPlus,
  Table,
  ListPlus,
} from "lucide-react";

const ALL_PERMIT_TYPES: WorkPermitType[] = [
  "hauteur",
  "point_chaud",
  "espace_confine",
  "electrique",
  "excavation",
  "levage",
  "toiture",
  "tuyauterie",
  "maconnerie",
  "chimique",
  "consignation_loto",
  "autre",
];

interface TemplateBuilderFormProps {
  initialTemplate?: WorkPermitTemplate | null;
}

export function TemplateBuilderForm({ initialTemplate }: TemplateBuilderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // General Template Fields
  const [name, setName] = useState(initialTemplate?.name || "");
  const [code, setCode] = useState(initialTemplate?.code || "");
  const [description, setDescription] = useState(initialTemplate?.description || "");

  // Snapshot Configuration State
  const initialConfig: WorkPermitTemplateSnapshot =
    initialTemplate?.activeVersion?.configuration || DEFAULT_TEMPLATE_SNAPSHOT;

  const [maxValidityHours, setMaxValidityHours] = useState<number>(
    initialConfig.maxValidityHours || 8
  );
  const [enabledTypes, setEnabledTypes] = useState<WorkPermitType[]>(
    initialConfig.enabledPermitTypes || ALL_PERMIT_TYPES
  );
  const [questionnaires, setQuestionnaires] = useState<Record<string, QuestionnaireQuestion[]>>(
    initialConfig.questionnaires || DEFAULT_TEMPLATE_SNAPSHOT.questionnaires
  );
  const [beforeMeasures, setBeforeMeasures] = useState<SafetyMeasure[]>(
    initialConfig.beforeMeasures || DEFAULT_TEMPLATE_SNAPSHOT.beforeMeasures
  );
  const [duringMeasures, setDuringMeasures] = useState<SafetyMeasure[]>(
    initialConfig.duringMeasures || DEFAULT_TEMPLATE_SNAPSHOT.duringMeasures
  );
  const [afterMeasures, setAfterMeasures] = useState<SafetyMeasure[]>(
    initialConfig.afterMeasures || DEFAULT_TEMPLATE_SNAPSHOT.afterMeasures
  );
  const [epiList, setEpiList] = useState<{ id: string; label: string }[]>(
    initialConfig.epiList || DEFAULT_TEMPLATE_SNAPSHOT.epiList
  );
  const [equipmentList] = useState<string[]>(
    initialConfig.equipmentList || DEFAULT_TEMPLATE_SNAPSHOT.equipmentList || []
  );
  const [emergencyAlerte, setEmergencyAlerte] = useState(
    initialConfig.emergencyPlanConfig?.alerte || ""
  );
  const [emergencyEvacuation, setEmergencyEvacuation] = useState(
    initialConfig.emergencyPlanConfig?.evacuation || ""
  );
  const [emergencySecours, setEmergencySecours] = useState(
    initialConfig.emergencyPlanConfig?.secours || ""
  );

  // Custom Sections Draft State
  const [customSections, setCustomSections] = useState<CustomSectionConfig[]>(
    initialConfig.customSections || []
  );

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");
  const [newSectionShowPrint, setNewSectionShowPrint] = useState(true);
  const [newSectionRequired, setNewSectionRequired] = useState(false);

  // Custom Field Draft State
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldConfig["type"]>("text");
  const [newFieldDescription, setNewFieldDescription] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldCritical, setNewFieldCritical] = useState(false);
  const [newFieldBlocking, setNewFieldBlocking] = useState("");
  const [newFieldOptionsStr, setNewFieldOptionsStr] = useState("");

  // Table Columns Draft State
  const [tableColumnsDraft, setTableColumnsDraft] = useState<CustomColumnConfig[]>([]);
  const [newColLabel, setNewColLabel] = useState("");
  const [newColType, setNewColType] = useState<CustomColumnConfig["type"]>("text");
  const [newColOptionsStr, setNewColOptionsStr] = useState("");

  // Tab & Editor States
  const [activeTab, setActiveTab] = useState<"general" | "types" | "questions" | "measures" | "epi" | "custom_sections" | "preview">("general");
  const [selectedQuestionType, setSelectedQuestionType] = useState<WorkPermitType>("hauteur");

  // New question draft
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<QuestionnaireQuestion["type"]>("yes_no");
  const [newQuestionCritical, setNewQuestionCritical] = useState(false);
  const [newQuestionBlocking, setNewQuestionBlocking] = useState("");

  // New measure draft
  const [newMeasureLabel, setNewMeasureLabel] = useState("");
  const [newMeasurePhase, setNewMeasurePhase] = useState<"before" | "during" | "after">("before");
  const [newMeasureCritical, setNewMeasureCritical] = useState(false);

  // New EPI draft
  const [newEpiLabel, setNewEpiLabel] = useState("");

  function handleAddSection() {
    if (!newSectionTitle.trim()) return;
    const secId = `sec_${Date.now()}`;
    const newSec: CustomSectionConfig = {
      id: secId,
      title: newSectionTitle.trim(),
      description: newSectionDescription.trim() || undefined,
      order: customSections.length + 1,
      active: true,
      showOnPrint: newSectionShowPrint,
      showOnScreen: true,
      required: newSectionRequired,
      fields: [],
    };
    setCustomSections([...customSections, newSec]);
    setNewSectionTitle("");
    setNewSectionDescription("");
    setActiveSectionId(secId);
  }

  function handleRemoveSection(secId: string) {
    setCustomSections(customSections.filter((s) => s.id !== secId));
    if (activeSectionId === secId) setActiveSectionId("");
  }

  function handleAddColumnToTableDraft() {
    if (!newColLabel.trim()) return;
    const colId = `col_${Date.now()}`;
    const opts = newColOptionsStr
      ? newColOptionsStr.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    setTableColumnsDraft([
      ...tableColumnsDraft,
      { id: colId, label: newColLabel.trim(), type: newColType, options: opts },
    ]);
    setNewColLabel("");
    setNewColOptionsStr("");
  }

  function handleRemoveColumnFromTableDraft(colId: string) {
    setTableColumnsDraft(tableColumnsDraft.filter((c) => c.id !== colId));
  }

  function handleAddFieldToSection() {
    if (!activeSectionId || !newFieldLabel.trim()) return;

    const opts = newFieldOptionsStr
      ? newFieldOptionsStr.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const fieldId = `fld_${Date.now()}`;
    const targetSection = customSections.find((s) => s.id === activeSectionId);
    const order = (targetSection?.fields?.length || 0) + 1;

    const newField: CustomFieldConfig = {
      id: fieldId,
      label: newFieldLabel.trim(),
      description: newFieldDescription.trim() || undefined,
      type: newFieldType,
      order,
      required: newFieldRequired,
      critical: newFieldCritical,
      blockingValue: newFieldBlocking.trim() || undefined,
      options: opts,
      showOnPrint: true,
      columns: newFieldType === "table" ? tableColumnsDraft : undefined,
    };

    setCustomSections(
      customSections.map((sec) => {
        if (sec.id === activeSectionId) {
          return {
            ...sec,
            fields: [...(sec.fields || []), newField],
          };
        }
        return sec;
      })
    );

    setNewFieldLabel("");
    setNewFieldDescription("");
    setNewFieldRequired(false);
    setNewFieldCritical(false);
    setNewFieldBlocking("");
    setNewFieldOptionsStr("");
    setTableColumnsDraft([]);
  }

  function handleRemoveFieldFromSection(secId: string, fieldId: string) {
    setCustomSections(
      customSections.map((sec) => {
        if (sec.id === secId) {
          return {
            ...sec,
            fields: (sec.fields || []).filter((f) => f.id !== fieldId),
          };
        }
        return sec;
      })
    );
  }

  function toggleType(type: WorkPermitType) {
    if (enabledTypes.includes(type)) {
      if (enabledTypes.length <= 1) {
        setError("Au moins un type de travail doit être activé.");
        return;
      }
      setEnabledTypes(enabledTypes.filter((t) => t !== type));
    } else {
      setEnabledTypes([...enabledTypes, type]);
    }
  }

  function handleAddQuestion() {
    if (!newQuestionLabel.trim()) return;
    const currentQuestions = questionnaires[selectedQuestionType] || [];
    const qId = `q_${selectedQuestionType}_${Date.now()}`;

    const newQuestion: QuestionnaireQuestion = {
      id: qId,
      label: newQuestionLabel.trim(),
      type: newQuestionType,
      critical: newQuestionCritical,
      blockingValue: newQuestionBlocking.trim() || undefined,
    };

    setQuestionnaires({
      ...questionnaires,
      [selectedQuestionType]: [...currentQuestions, newQuestion],
    });

    setNewQuestionLabel("");
    setNewQuestionCritical(false);
    setNewQuestionBlocking("");
  }

  function handleRemoveQuestion(qId: string) {
    const currentQuestions = questionnaires[selectedQuestionType] || [];
    setQuestionnaires({
      ...questionnaires,
      [selectedQuestionType]: currentQuestions.filter((q) => q.id !== qId),
    });
  }

  function handleAddMeasure() {
    if (!newMeasureLabel.trim()) return;
    const mId = `m_${newMeasurePhase}_${Date.now()}`;
    const newMeasure: SafetyMeasure = {
      id: mId,
      label: newMeasureLabel.trim(),
      checked: false,
      critical: newMeasureCritical,
    };

    if (newMeasurePhase === "before") {
      setBeforeMeasures([...beforeMeasures, newMeasure]);
    } else if (newMeasurePhase === "during") {
      setDuringMeasures([...duringMeasures, newMeasure]);
    } else {
      setAfterMeasures([...afterMeasures, newMeasure]);
    }

    setNewMeasureLabel("");
    setNewMeasureCritical(false);
  }

  function handleRemoveMeasure(phase: "before" | "during" | "after", id: string) {
    if (phase === "before") {
      setBeforeMeasures(beforeMeasures.filter((m) => m.id !== id));
    } else if (phase === "during") {
      setDuringMeasures(duringMeasures.filter((m) => m.id !== id));
    } else {
      setAfterMeasures(afterMeasures.filter((m) => m.id !== id));
    }
  }

  function handleAddEpi() {
    if (!newEpiLabel.trim()) return;
    const epiId = `epi_${Date.now()}`;
    setEpiList([...epiList, { id: epiId, label: newEpiLabel.trim() }]);
    setNewEpiLabel("");
  }

  function handleRemoveEpi(id: string) {
    setEpiList(epiList.filter((e) => e.id !== id));
  }

  function buildSnapshot(): WorkPermitTemplateSnapshot {
    return {
      templateName: name.trim() || "Modèle PtW Personnalisé",
      versionLabel: initialTemplate?.activeVersion?.versionLabel || "v1.0",
      maxValidityHours,
      enabledPermitTypes: enabledTypes,
      questionnaires,
      beforeMeasures,
      duringMeasures,
      afterMeasures,
      epiList,
      equipmentList,
      emergencyPlanConfig: {
        alerte: emergencyAlerte,
        evacuation: emergencyEvacuation,
        secours: emergencySecours,
      },
      signatureChain: [
        "Demandeur (Responsable des travaux)",
        "Chargé de consignation / Zone",
        "Responsable QHSE / Validateur",
      ],
      customSections,
    };
  }

  function handleSaveDraft() {
    setError(null);
    setSuccess(null);

    if (!name.trim() || !code.trim()) {
      setError("Le nom et le code du modèle sont obligatoires.");
      return;
    }

    startTransition(async () => {
      const config = buildSnapshot();

      if (initialTemplate && initialTemplate.id !== "default") {
        const res = await updateWorkPermitTemplateDraft(initialTemplate.id, {
          name,
          code,
          description,
          configuration: config,
        });
        if (res.error) {
          setError(res.error);
        } else {
          setSuccess("Brouillon sauvegardé avec succès.");
          router.refresh();
        }
      } else {
        const res = await createWorkPermitTemplate({
          name,
          code,
          description,
          configuration: config,
        });
        if (res.error) {
          setError(res.error);
        } else if (res.templateId) {
          setSuccess("Modèle créé en brouillon.");
          router.push(`/parametres/permis-de-travail/modeles/${res.templateId}`);
        }
      }
    });
  }

  function handlePublishVersion() {
    setError(null);
    setSuccess(null);

    if (!name.trim() || !code.trim()) {
      setError("Le nom et le code du modèle sont obligatoires.");
      return;
    }

    startTransition(async () => {
      const config = buildSnapshot();

      if (initialTemplate && initialTemplate.id !== "default") {
        const res = await publishTemplateVersion(initialTemplate.id, config);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccess("Version du référentiel publiée avec succès !");
          router.push("/parametres/permis-de-travail/modeles");
        }
      } else {
        // Create and publish
        const createRes = await createWorkPermitTemplate({
          name,
          code,
          description,
          configuration: config,
        });
        if (createRes.error || !createRes.templateId) {
          setError(createRes.error || "Impossible de créer le modèle.");
          return;
        }
        const pubRes = await publishTemplateVersion(createRes.templateId, config);
        if (pubRes.error) {
          setError(pubRes.error);
        } else {
          setSuccess("Référentiel publié !");
          router.push("/parametres/permis-de-travail/modeles");
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/parametres/permis-de-travail/modeles")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {initialTemplate ? `Édition : ${initialTemplate.name}` : "Nouveau Référentiel PtW"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Configuration du référentiel entreprise pour le moteur PtW.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={isPending}
            onClick={handleSaveDraft}
          >
            <Save className="h-4 w-4 mr-1.5" /> Enregistrer Brouillon
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isPending}
            onClick={handlePublishVersion}
          >
            <Rocket className="h-4 w-4 mr-1.5" /> Publier la Version
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "general"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4" /> 1. Général & Durée
        </button>
        <button
          onClick={() => setActiveTab("types")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "types"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" /> 2. Types de travaux ({enabledTypes.length})
        </button>
        <button
          onClick={() => setActiveTab("questions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "questions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <HelpCircle className="h-4 w-4" /> 3. Questionnaire
        </button>
        <button
          onClick={() => setActiveTab("measures")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "measures"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4" /> 4. Mesures de sécurité
        </button>
        <button
          onClick={() => setActiveTab("epi")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "epi"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <HardHat className="h-4 w-4" /> 5. EPI & Équipements
        </button>
        <button
          onClick={() => setActiveTab("custom_sections")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "custom_sections"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FolderPlus className="h-4 w-4" /> 6. Sections sur-mesure ({customSections.length})
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "preview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" /> 7. Aperçu Synthétique
        </button>
      </div>

      {/* Tab 1: General & Validity */}
      {activeTab === "general" && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">
            Informations Générales du Référentiel
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du Modèle / Référentiel *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Permis PtW EREPCO Industrie"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code Référentiel *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ex: REF-EREPCO-01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description & Champ d'application</Label>
            <Textarea
              id="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description des règles applicables sur les sites de l'entreprise..."
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <Label htmlFor="validity" className="flex items-center gap-2 font-medium">
              <Clock className="h-4 w-4 text-amber-500" />
              Durée maximale de validité d'un permis (heures)
            </Label>
            <Input
              id="validity"
              type="number"
              min={1}
              max={24}
              value={maxValidityHours}
              onChange={(e) => setMaxValidityHours(parseInt(e.target.value) || 8)}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Limite contrôlée côté serveur lors de la création d'un permis. Par défaut : 8 heures.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Enabled Permit Types */}
      {activeTab === "types" && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">
            Types de travaux activés dans ce référentiel
          </h3>
          <p className="text-xs text-muted-foreground">
            Cochez les catégories de travaux à haut risque autorisées pour ce modèle entreprise.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 pt-2">
            {ALL_PERMIT_TYPES.map((type) => {
              const isChecked = enabledTypes.includes(type);
              return (
                <div
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isChecked
                      ? "border-primary bg-primary/5 text-foreground font-medium"
                      : "border-border bg-muted/20 text-muted-foreground"
                  }`}
                >
                  <Checkbox checked={isChecked} onCheckedChange={() => toggleType(type)} />
                  <span className="text-sm">{PERMIT_TYPE_LABELS[type]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Questionnaire Builder */}
      {activeTab === "questions" && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
            <h3 className="text-base font-semibold text-foreground">
              Configuration des Questionnaires par Type de Travaux
            </h3>
            <div className="w-64">
              <select
                value={selectedQuestionType}
                onChange={(e) => setSelectedQuestionType(e.target.value as WorkPermitType)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {enabledTypes.map((t) => (
                  <option key={t} value={t}>
                    {PERMIT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current questions list */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Questions configurées pour {PERMIT_TYPE_LABELS[selectedQuestionType]} ({(questionnaires[selectedQuestionType] || []).length})
            </div>

            <div className="divide-y divide-border border border-border rounded-md bg-background">
              {(questionnaires[selectedQuestionType] || []).length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  Aucune question configurée pour ce type de travail.
                </div>
              ) : (
                (questionnaires[selectedQuestionType] || []).map((q, idx) => (
                  <div key={q.id} className="p-3 flex items-start justify-between gap-3 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                        <span className="font-medium text-foreground">{q.label}</span>
                        {q.critical && (
                          <Badge variant="destructive" className="text-[10px] py-0">
                            Critique bloquante
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] py-0 capitalize">
                          {q.type}
                        </Badge>
                      </div>
                      {q.blockingValue && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Valeur bloquante : <code className="bg-amber-500/10 px-1 rounded">{q.blockingValue}</code>
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Question Form */}
          <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" /> Ajouter une question personnalisée
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="qLabel" className="text-xs">Libellé de la question</Label>
                <Input
                  id="qLabel"
                  value={newQuestionLabel}
                  onChange={(e) => setNewQuestionLabel(e.target.value)}
                  placeholder="ex: Vérification des liaisons équipotentielles effectuée"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="qType" className="text-xs">Type de champ</Label>
                <select
                  id="qType"
                  value={newQuestionType}
                  onChange={(e) => setNewQuestionType(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm"
                >
                  <option value="yes_no">Oui / Non</option>
                  <option value="compliance">Conforme / Non conforme</option>
                  <option value="text">Texte libre</option>
                  <option value="number">Nombre / Valeur numérique</option>
                  <option value="select">Liste déroulante</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <Checkbox
                    checked={newQuestionCritical}
                    onCheckedChange={(c) => setNewQuestionCritical(!!c)}
                  />
                  <span>Question critique bloquante</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Valeur déclenchant un blocage :</span>
                  <Input
                    value={newQuestionBlocking}
                    onChange={(e) => setNewQuestionBlocking(e.target.value)}
                    placeholder="ex: non ou non_conforme"
                    className="w-36 h-7 text-xs"
                  />
                </div>
              </div>

              <Button size="sm" onClick={handleAddQuestion} disabled={!newQuestionLabel.trim()}>
                Ajouter la question
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Safety Measures */}
      {activeTab === "measures" && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-6">
          <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">
            Mesures de Sécurité (AVANT / PENDANT / APRÈS)
          </h3>

          <div className="grid gap-6 md:grid-cols-3">
            {/* AVANT */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                1. Mesures AVANT ({beforeMeasures.length})
              </div>
              <div className="divide-y divide-border border border-border rounded-md bg-background min-h-[160px] p-2 space-y-2">
                {beforeMeasures.map((m) => (
                  <div key={m.id} className="p-2 flex items-start justify-between gap-2 text-xs">
                    <div>
                      <p className="font-medium text-foreground">{m.label}</p>
                      {m.critical && <span className="text-[10px] text-destructive font-semibold">Critique</span>}
                    </div>
                    <button onClick={() => handleRemoveMeasure("before", m.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* PENDANT */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                2. Mesures PENDANT ({duringMeasures.length})
              </div>
              <div className="divide-y divide-border border border-border rounded-md bg-background min-h-[160px] p-2 space-y-2">
                {duringMeasures.map((m) => (
                  <div key={m.id} className="p-2 flex items-start justify-between gap-2 text-xs">
                    <div>
                      <p className="font-medium text-foreground">{m.label}</p>
                      {m.critical && <span className="text-[10px] text-destructive font-semibold">Critique</span>}
                    </div>
                    <button onClick={() => handleRemoveMeasure("during", m.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* APRÈS */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                3. Mesures APRÈS ({afterMeasures.length})
              </div>
              <div className="divide-y divide-border border border-border rounded-md bg-background min-h-[160px] p-2 space-y-2">
                {afterMeasures.map((m) => (
                  <div key={m.id} className="p-2 flex items-start justify-between gap-2 text-xs">
                    <div>
                      <p className="font-medium text-foreground">{m.label}</p>
                      {m.critical && <span className="text-[10px] text-destructive font-semibold">Critique</span>}
                    </div>
                    <button onClick={() => handleRemoveMeasure("after", m.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Add Measure Form */}
          <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" /> Ajouter une mesure de sécurité
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="mLabel" className="text-xs">Libellé de la mesure</Label>
                <Input
                  id="mLabel"
                  value={newMeasureLabel}
                  onChange={(e) => setNewMeasureLabel(e.target.value)}
                  placeholder="ex: Détecteur 4 gaz étalonné présent sur zone"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mPhase" className="text-xs">Phase</Label>
                <select
                  id="mPhase"
                  value={newMeasurePhase}
                  onChange={(e) => setNewMeasurePhase(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm"
                >
                  <option value="before">AVANT l'intervention</option>
                  <option value="during">PENDANT l'intervention</option>
                  <option value="after">APRÈS l'intervention</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <Button size="sm" className="w-full" onClick={handleAddMeasure} disabled={!newMeasureLabel.trim()}>
                  Ajouter
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: EPI & Equipment */}
      {activeTab === "epi" && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-6">
          <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">
            Catalogue d'EPI et Équipements de Sécurité
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Liste des EPI configurés ({epiList.length})
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {epiList.map((epi) => (
                <div key={epi.id} className="flex items-center justify-between p-2.5 rounded-md border border-border bg-background text-xs">
                  <span className="font-medium text-foreground">{epi.label}</span>
                  <button onClick={() => handleRemoveEpi(epi.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add EPI */}
            <div className="flex items-center gap-2 pt-2">
              <Input
                value={newEpiLabel}
                onChange={(e) => setNewEpiLabel(e.target.value)}
                placeholder="Ajouter un nouvel EPI (ex: Combinaison étanche EN 943)"
                className="text-xs h-9"
              />
              <Button size="sm" onClick={handleAddEpi} disabled={!newEpiLabel.trim()}>
                Ajouter EPI
              </Button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold text-foreground">Consignes du Plan d'Urgence</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="emAlerte" className="text-xs">Moyens d'alerte</Label>
                <Textarea
                  id="emAlerte"
                  rows={2}
                  value={emergencyAlerte}
                  onChange={(e) => setEmergencyAlerte(e.target.value)}
                  placeholder="ex: Appeler le PC Sécurité au poste 5555..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emEvac" className="text-xs">Évacuation</Label>
                <Textarea
                  id="emEvac"
                  rows={2}
                  value={emergencyEvacuation}
                  onChange={(e) => setEmergencyEvacuation(e.target.value)}
                  placeholder="ex: Point de rassemblement Sud..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emSecours" className="text-xs">Secours</Label>
                <Textarea
                  id="emSecours"
                  rows={2}
                  value={emergencySecours}
                  onChange={(e) => setEmergencySecours(e.target.value)}
                  placeholder="ex: SST désignés et trousse à pharmacie..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Custom Sections, Fields & Tables */}
      {activeTab === "custom_sections" && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-primary" />
                Sections & Champs Personnalisés
              </h3>
              <p className="text-xs text-muted-foreground">
                Ajoutez des sections spécifiques avec champs (texte, nombre, choix, dates, pièces jointes) et tableaux dynamiques (ex: Consignations, Relevés 4-gaz).
              </p>
            </div>
          </div>

          {/* List of custom sections */}
          <div className="space-y-4">
            {customSections.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                Aucune section sur-mesure configurée. Utilisez le formulaire ci-dessous pour ajouter votre première section.
              </div>
            ) : (
              customSections.map((sec, sIdx) => {
                const isCurrentActive = activeSectionId === sec.id;
                return (
                  <div
                    key={sec.id}
                    className={`rounded-lg border p-4 transition-all ${
                      isCurrentActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">
                            SECTION #{sIdx + 1}
                          </span>
                          <h4 className="font-semibold text-foreground text-sm">{sec.title}</h4>
                          {sec.required && (
                            <Badge variant="destructive" className="text-[10px] py-0">
                              Obligatoire
                            </Badge>
                          )}
                          {sec.showOnPrint && (
                            <Badge variant="outline" className="text-[10px] py-0">
                              Impression OK
                            </Badge>
                          )}
                        </div>
                        {sec.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{sec.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={isCurrentActive ? "default" : "outline"}
                          className="h-7 text-xs"
                          onClick={() => setActiveSectionId(sec.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un Champ
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveSection(sec.id)}
                          className="text-destructive h-7 w-7 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Fields under this section */}
                    <div className="pt-3 space-y-2">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Champs de la section ({(sec.fields || []).length})
                      </span>

                      {(sec.fields || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Aucun champ ajouté dans cette section.</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(sec.fields || []).map((f) => (
                            <div
                              key={f.id}
                              className="flex items-start justify-between p-2.5 rounded border border-border bg-background text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground">{f.label}</span>
                                  <Badge variant="secondary" className="text-[9px] py-0 capitalize">
                                    {f.type}
                                  </Badge>
                                  {f.critical && (
                                    <Badge variant="destructive" className="text-[9px] py-0">
                                      Bloquant
                                    </Badge>
                                  )}
                                </div>
                                {f.type === "table" && f.columns && (
                                  <p className="text-[10px] text-muted-foreground">
                                    Colonnes : {f.columns.map((c) => c.label).join(", ")}
                                  </p>
                                )}
                                {f.blockingValue && (
                                  <p className="text-[10px] text-amber-600">
                                    Blocage si : {f.blockingValue}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleRemoveFieldFromSection(sec.id, f.id)}
                                className="text-muted-foreground hover:text-destructive shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Section Form */}
          <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FolderPlus className="h-4 w-4 text-primary" /> Ajouter une nouvelle section
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="secTitle" className="text-xs">Titre de la section</Label>
                <Input
                  id="secTitle"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="ex: Consignation & Électrique / Relevés d'atmosphère"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="secDesc" className="text-xs">Description (Optionnel)</Label>
                <Input
                  id="secDesc"
                  value={newSectionDescription}
                  onChange={(e) => setNewSectionDescription(e.target.value)}
                  placeholder="ex: Détail des procédures de blocage LOTO..."
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={newSectionShowPrint}
                    onCheckedChange={(c) => setNewSectionShowPrint(!!c)}
                  />
                  <span>Afficher à l'impression A4</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={newSectionRequired}
                    onCheckedChange={(c) => setNewSectionRequired(!!c)}
                  />
                  <span>Section obligatoire</span>
                </label>
              </div>

              <Button size="sm" onClick={handleAddSection} disabled={!newSectionTitle.trim()}>
                Créer la section
              </Button>
            </div>
          </div>

          {/* Add Field Form (if active section selected) */}
          {activeSectionId && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <ListPlus className="h-4 w-4" /> Ajouter un champ dans :{" "}
                  <span className="underline">
                    {customSections.find((s) => s.id === activeSectionId)?.title}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="fldLabel" className="text-xs">Nom / Libellé du champ *</Label>
                  <Input
                    id="fldLabel"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="ex: Numéro de consignation / LIE (%)"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fldType" className="text-xs">Type de champ *</Label>
                  <select
                    id="fldType"
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm"
                  >
                    <option value="text">Texte court</option>
                    <option value="textarea">Texte long / Zone de texte</option>
                    <option value="number">Nombre / Valeur numérique</option>
                    <option value="yes_no">Oui / Non</option>
                    <option value="yes_no_na">Oui / Non / N/A</option>
                    <option value="select">Sélection / Liste déroulante</option>
                    <option value="date">Date</option>
                    <option value="time">Heure</option>
                    <option value="person">Personne / Nom du responsable</option>
                    <option value="photo_proof">Preuve photo obligatoire</option>
                    <option value="table">📊 TABLEAU DYNAMIQUE (Lignes multiples)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fldDesc" className="text-xs">Description / Aide</Label>
                  <Input
                    id="fldDesc"
                    value={newFieldDescription}
                    onChange={(e) => setNewFieldDescription(e.target.value)}
                    placeholder="ex: Précisez la valeur lue sur le détecteur"
                  />
                </div>
              </div>

              {newFieldType === "select" && (
                <div className="space-y-1">
                  <Label htmlFor="fldOpts" className="text-xs">Options de sélection (séparées par des virgules)</Label>
                  <Input
                    id="fldOpts"
                    value={newFieldOptionsStr}
                    onChange={(e) => setNewFieldOptionsStr(e.target.value)}
                    placeholder="Option A, Option B, Option C"
                    className="text-xs"
                  />
                </div>
              )}

              {/* TABLE COLUMNS BUILDER (if type === 'table') */}
              {newFieldType === "table" && (
                <div className="space-y-3 rounded border border-border bg-background p-3">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Table className="h-4 w-4 text-primary" /> Colonnes du tableau sur-mesure ({(tableColumnsDraft.length)})
                  </span>

                  {tableColumnsDraft.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tableColumnsDraft.map((col) => (
                        <Badge key={col.id} variant="secondary" className="gap-1 text-xs py-1">
                          <span>{col.label}</span>
                          <span className="text-[10px] text-muted-foreground">({col.type})</span>
                          <button onClick={() => handleRemoveColumnFromTableDraft(col.id)} className="hover:text-destructive">
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      value={newColLabel}
                      onChange={(e) => setNewColLabel(e.target.value)}
                      placeholder="Nom de la colonne (ex: Cadenas #)"
                      className="text-xs h-8"
                    />
                    <select
                      value={newColType}
                      onChange={(e) => setNewColType(e.target.value as any)}
                      className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="text">Texte</option>
                      <option value="number">Nombre</option>
                      <option value="yes_no">Oui/Non</option>
                      <option value="select">Sélection</option>
                    </select>
                    <Button size="sm" className="h-8 text-xs" onClick={handleAddColumnToTableDraft} disabled={!newColLabel.trim()}>
                      + Ajouter colonne
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <Checkbox
                      checked={newFieldRequired}
                      onCheckedChange={(c) => setNewFieldRequired(!!c)}
                    />
                    <span>Champ obligatoire</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <Checkbox
                      checked={newFieldCritical}
                      onCheckedChange={(c) => setNewFieldCritical(!!c)}
                    />
                    <span>Critique bloquant</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Valeur bloquante :</span>
                    <Input
                      value={newFieldBlocking}
                      onChange={(e) => setNewFieldBlocking(e.target.value)}
                      placeholder="ex: non"
                      className="w-28 h-7 text-xs"
                    />
                  </div>
                </div>

                <Button size="sm" onClick={handleAddFieldToSection} disabled={!newFieldLabel.trim()}>
                  Valider et ajouter le champ
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 7: Synthetic Preview */}
      {activeTab === "preview" && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-6">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <Badge variant="outline" className="mb-1">{code || "CODE-REF"}</Badge>
              <h3 className="text-lg font-bold text-foreground">{name || "Nom du Référentiel"}</h3>
              <p className="text-xs text-muted-foreground">{description || "Aucune description fournie."}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Durée maximale</span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400">{maxValidityHours} heures</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="space-y-2 p-3 rounded-md border border-border bg-muted/20">
              <span className="font-semibold text-foreground block">Types de travaux autorisés ({enabledTypes.length})</span>
              <div className="flex flex-wrap gap-1">
                {enabledTypes.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">
                    {PERMIT_TYPE_LABELS[t]}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2 p-3 rounded-md border border-border bg-muted/20">
              <span className="font-semibold text-foreground block">Mesures de sécurité</span>
              <div className="text-muted-foreground space-y-0.5">
                <p>• {beforeMeasures.length} mesures AVANT</p>
                <p>• {duringMeasures.length} mesures PENDANT</p>
                <p>• {afterMeasures.length} mesures APRÈS</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isPending}>
              Enregistrer Brouillon
            </Button>
            <Button onClick={handlePublishVersion} disabled={isPending}>
              <Rocket className="h-4 w-4 mr-1.5" /> Publier ce Référentiel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
