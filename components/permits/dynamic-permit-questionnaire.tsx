"use client";

import { useState } from "react";
import {
  PERMIT_QUESTIONNAIRES,
  STANDARD_BEFORE_MEASURES,
  STANDARD_DURING_MEASURES,
  STANDARD_AFTER_MEASURES,
  DEFAULT_EPI_LIST,
} from "@/lib/constants/permit-questionnaires";
import type {
  WorkPermitType,
  SafetyMeasure,
  WorkPermitTemplateSnapshot,
  CustomColumnConfig,
} from "@/lib/types/permits";
import { CheckCircle2, ShieldAlert, HelpCircle, HardHat, LifeBuoy, FolderPlus, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface DynamicPermitQuestionnaireProps {
  permitType: WorkPermitType;
  templateSnapshot?: WorkPermitTemplateSnapshot | null;
  answers?: Record<string, any>;
  onChangeAnswers?: (newAnswers: Record<string, any>) => void;
  beforeMeasures?: SafetyMeasure[];
  onChangeBeforeMeasures?: (measures: SafetyMeasure[]) => void;
  duringMeasures?: SafetyMeasure[];
  onChangeDuringMeasures?: (measures: SafetyMeasure[]) => void;
  afterMeasures?: SafetyMeasure[];
  onChangeAfterMeasures?: (measures: SafetyMeasure[]) => void;
  selectedEpi?: string[];
  onChangeEpi?: (epiList: string[]) => void;
  customFieldsData?: Record<string, any>;
  onChangeCustomFieldsData?: (data: Record<string, any>) => void;
  // Event callback aliases for forms
  onQuestionnaireChange?: (answers: Record<string, any>) => void;
  onBeforeMeasuresChange?: (measures: SafetyMeasure[]) => void;
  onDuringMeasuresChange?: (measures: SafetyMeasure[]) => void;
  onAfterMeasuresChange?: (measures: SafetyMeasure[]) => void;
  onEpiChange?: (epi: Record<string, boolean>) => void;
  onEmergencyPlanChange?: (plan: string) => void;
  onCustomFieldsDataChange?: (data: Record<string, any>) => void;
  onBlockingStateChange?: (hasBlocking: boolean) => void;
  onCreateCapa?: (title: string, description: string) => void;
}

export function DynamicPermitQuestionnaire({
  permitType,
  templateSnapshot,
  answers: propAnswers,
  onChangeAnswers,
  beforeMeasures: propBefore,
  onChangeBeforeMeasures,
  duringMeasures: propDuring,
  onChangeDuringMeasures,
  afterMeasures: propAfter,
  onChangeAfterMeasures,
  selectedEpi: propEpi,
  onChangeEpi,
  customFieldsData: propCustomFields,
  onChangeCustomFieldsData,
  onQuestionnaireChange,
  onBeforeMeasuresChange,
  onDuringMeasuresChange,
  onAfterMeasuresChange,
  onEpiChange,
  onEmergencyPlanChange,
  onCustomFieldsDataChange,
  onBlockingStateChange,
  onCreateCapa,
}: DynamicPermitQuestionnaireProps) {
  const [activeTab, setActiveTab] = useState<"questionnaire" | "custom_sections" | "phases" | "epi" | "emergency">("questionnaire");

  const defaultBefore = templateSnapshot?.beforeMeasures || STANDARD_BEFORE_MEASURES;
  const defaultDuring = templateSnapshot?.duringMeasures || STANDARD_DURING_MEASURES;
  const defaultAfter = templateSnapshot?.afterMeasures || STANDARD_AFTER_MEASURES;
  const availableEpiList = templateSnapshot?.epiList || DEFAULT_EPI_LIST;
  const customSections = templateSnapshot?.customSections || [];

  // Internal Fallback States
  const [internalAnswers, setInternalAnswers] = useState<Record<string, any>>({});
  const [internalBefore, setInternalBefore] = useState<SafetyMeasure[]>(defaultBefore);
  const [internalDuring, setInternalDuring] = useState<SafetyMeasure[]>(defaultDuring);
  const [internalAfter, setInternalAfter] = useState<SafetyMeasure[]>(defaultAfter);
  const [internalEpi, setInternalEpi] = useState<string[]>(["casque", "chaussures", "vetements"]);
  const [internalCustomFields, setInternalCustomFields] = useState<Record<string, any>>({});
  const [emergencyText, setEmergencyText] = useState("");

  const answers = propAnswers ?? internalAnswers;
  const beforeMeasures = propBefore ?? internalBefore;
  const duringMeasures = propDuring ?? internalDuring;
  const afterMeasures = propAfter ?? internalAfter;
  const selectedEpi = propEpi ?? internalEpi;
  const customFieldsData = propCustomFields ?? internalCustomFields;

  const questions =
    templateSnapshot?.questionnaires?.[permitType] ||
    PERMIT_QUESTIONNAIRES[permitType] ||
    PERMIT_QUESTIONNAIRES.autre;

  const blockingItems = questions.filter((q) => {
    if (!q.blockingValue) return false;
    const v = answers[q.id];
    return v && v.toString().toLowerCase() === q.blockingValue.toLowerCase();
  });

  // Check blocking items across standard questions and custom fields
  function isAnyItemBlocking(currentAnswers: Record<string, any>, currentCustom: Record<string, any>): boolean {
    const stdBlocking = questions.some((q) => {
      if (!q.blockingValue) return false;
      const v = currentAnswers[q.id];
      return v && v.toString().toLowerCase() === q.blockingValue.toLowerCase();
    });

    if (stdBlocking) return true;

    if (customSections.length > 0) {
      for (const sec of customSections) {
        for (const field of sec.fields || []) {
          const val = currentCustom[field.id];

          if (field.critical && (val === undefined || val === null || val === "")) {
            return true;
          }

          if (
            field.blockingValue &&
            val !== undefined &&
            val !== null &&
            val.toString().toLowerCase() === field.blockingValue.toLowerCase()
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function handleCustomFieldValueChange(fieldId: string, value: any) {
    const updated = { ...customFieldsData, [fieldId]: value };
    if (onChangeCustomFieldsData) onChangeCustomFieldsData(updated);
    if (onCustomFieldsDataChange) onCustomFieldsDataChange(updated);
    setInternalCustomFields(updated);

    if (onBlockingStateChange) {
      onBlockingStateChange(isAnyItemBlocking(answers, updated));
    }
  }

  function handleAddTableRow(fieldId: string, columns?: CustomColumnConfig[]) {
    const existingRows = Array.isArray(customFieldsData[fieldId]) ? customFieldsData[fieldId] : [];
    const newRow: Record<string, any> = { _id: `row_${Date.now()}` };
    if (columns) {
      columns.forEach((c) => {
        newRow[c.id] = "";
      });
    }
    handleCustomFieldValueChange(fieldId, [...existingRows, newRow]);
  }

  function handleUpdateTableRow(fieldId: string, rowIndex: number, colId: string, val: any) {
    const existingRows = Array.isArray(customFieldsData[fieldId]) ? [...customFieldsData[fieldId]] : [];
    if (existingRows[rowIndex]) {
      existingRows[rowIndex] = { ...existingRows[rowIndex], [colId]: val };
      handleCustomFieldValueChange(fieldId, existingRows);
    }
  }

  function handleRemoveTableRow(fieldId: string, rowIndex: number) {
    const existingRows = Array.isArray(customFieldsData[fieldId]) ? [...customFieldsData[fieldId]] : [];
    existingRows.splice(rowIndex, 1);
    handleCustomFieldValueChange(fieldId, existingRows);
  }

  function handleAnswerChange(questionId: string, value: any) {
    const updated = { ...answers, [questionId]: value };
    if (onChangeAnswers) onChangeAnswers(updated);
    if (onQuestionnaireChange) onQuestionnaireChange(updated);
    setInternalAnswers(updated);

    if (onBlockingStateChange) {
      onBlockingStateChange(isAnyItemBlocking(updated, customFieldsData));
    }
  }

  function toggleEpi(epiId: string) {
    let next: string[];
    if (selectedEpi.includes(epiId)) {
      next = selectedEpi.filter((id) => id !== epiId);
    } else {
      next = [...selectedEpi, epiId];
    }
    if (onChangeEpi) onChangeEpi(next);
    setInternalEpi(next);

    if (onEpiChange) {
      const record: Record<string, boolean> = {};
      next.forEach((id) => {
        record[id] = true;
      });
      onEpiChange(record);
    }
  }

  function handleBeforeToggle(id: string) {
    const next = beforeMeasures.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m));
    if (onChangeBeforeMeasures) onChangeBeforeMeasures(next);
    if (onBeforeMeasuresChange) onBeforeMeasuresChange(next);
    setInternalBefore(next);
  }

  function handleDuringToggle(id: string) {
    const next = duringMeasures.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m));
    if (onChangeDuringMeasures) onChangeDuringMeasures(next);
    if (onDuringMeasuresChange) onDuringMeasuresChange(next);
    setInternalDuring(next);
  }

  function handleAfterToggle(id: string) {
    const next = afterMeasures.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m));
    if (onChangeAfterMeasures) onChangeAfterMeasures(next);
    if (onAfterMeasuresChange) onAfterMeasuresChange(next);
    setInternalAfter(next);
  }

  function handleEmergencyChange(text: string) {
    setEmergencyText(text);
    if (onEmergencyPlanChange) onEmergencyPlanChange(text);
  }

  return (
    <div className="space-y-6">
      {/* Alerte Bloquante Globale si non-conformité critique */}
      {blockingItems.length > 0 && (
        <div className="rounded-xl border-2 border-red-500/80 bg-red-50 dark:bg-red-950/40 p-4 space-y-2 shadow-sm animate-pulse">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold text-sm">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
            <span>🔴 ALERTE BLOQUANTE — AUTORISATION IMPOSSIBLE</span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400">
            {blockingItems.length} point(s) de sécurité critique(s) ne sont pas satisfaits. Le permis ne pourra pas être validé tant que ces points ne seront pas résolus ou accompagnés d'une action CAPA.
          </p>
          <ul className="list-disc pl-5 text-xs text-red-700 dark:text-red-300 space-y-1 font-medium">
            {blockingItems.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-2">
                <span>{q.label} (Réponse: <span className="uppercase">{answers[q.id]}</span>)</span>
                {onCreateCapa && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] bg-red-100 dark:bg-red-900 border-red-300 text-red-800 dark:text-red-200 hover:bg-red-200"
                    onClick={() =>
                      onCreateCapa(
                        `Action CAPA - Point critique PtW: ${q.label}`,
                        `Résolution urgente de la non-conformité constatée sur le permis de travail (${q.label})`
                      )
                    }
                  >
                    + Créer Action CAPA
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs navigation questionnaire */}
      <div className="flex flex-wrap border-b border-border text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("questionnaire")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "questionnaire" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Questionnaire Spécifique ({questions.length})
        </button>

        {customSections.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("custom_sections")}
            className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "custom_sections" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Sections Sur-Mesure ({customSections.length})
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("phases")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "phases" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Mesures AVANT / PENDANT / APRÈS
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("epi")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "epi" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <HardHat className="h-3.5 w-3.5" />
          Équipements de Protection (EPI)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("emergency")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "emergency" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <LifeBuoy className="h-3.5 w-3.5" />
          Plan d&apos;Urgence / Secours
        </button>
      </div>

      {/* QUESTIONNAIRE SPÉCIFIQUE */}
      {activeTab === "questionnaire" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Répondez avec précision à l'analyse de risque spécifique pour le type de travaux sélectionné.
          </p>

          <div className="space-y-2.5">
            {questions.map((q) => {
              const val = answers[q.id];
              const isBlocking = q.blockingValue && val && val.toString().toLowerCase() === q.blockingValue.toLowerCase();

              return (
                <div
                  key={q.id}
                  className={`rounded-lg border p-3 text-xs transition-all ${
                    isBlocking
                      ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                      : val
                      ? "border-border bg-card"
                      : "border-amber-400/60 bg-amber-50/30 dark:bg-amber-950/10"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        {q.critical && <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300">CRITIQUE</span>}
                        <span className="font-medium text-foreground">{q.label}</span>
                      </div>
                    </div>

                    {/* Inputs selon le type de question */}
                    <div className="flex items-center gap-2">
                      {q.type === "yes_no" && (
                        <div className="flex rounded-md border border-input p-0.5 bg-background">
                          <button
                            type="button"
                            onClick={() => handleAnswerChange(q.id, "oui")}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                              val === "oui" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            OUI
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnswerChange(q.id, "non")}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                              val === "non" ? "bg-red-600 text-white" : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            NON
                          </button>
                        </div>
                      )}

                      {q.type === "compliance" && (
                        <div className="flex rounded-md border border-input p-0.5 bg-background">
                          <button
                            type="button"
                            onClick={() => handleAnswerChange(q.id, "conforme")}
                            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                              val === "conforme" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            CONFORME
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnswerChange(q.id, "non_conforme")}
                            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                              val === "non_conforme" ? "bg-red-600 text-white" : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            NON CONFORME
                          </button>
                        </div>
                      )}

                      {q.type === "select" && (
                        <select
                          value={val || ""}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="rounded-md border border-input bg-background px-2.5 py-1 text-xs"
                        >
                          <option value="">Sélectionner...</option>
                          {q.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {q.type === "number" && (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="any"
                            value={val || ""}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="h-7 w-24 text-xs font-mono"
                            placeholder="Valeur"
                          />
                          {q.unit && <span className="text-xs text-muted-foreground font-mono">{q.unit}</span>}
                        </div>
                      )}

                      {q.type === "text" && (
                        <Input
                          type="text"
                          value={val || ""}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="h-7 w-44 text-xs"
                          placeholder="Saisir mesure / détail"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTIONS SUR-MESURE DE L'ENTREPRISE */}
      {activeTab === "custom_sections" && customSections.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Saisissez les informations et tableaux spécifiques requis par le référentiel entreprise.
          </p>
          {customSections.map((sec) => (
            <div key={sec.id} className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">{sec.title}</h4>
                {sec.description && <p className="text-[11px] text-muted-foreground mt-0.5">{sec.description}</p>}
              </div>

              <div className="space-y-3">
                {sec.fields.map((field) => {
                  const val = customFieldsData[field.id];
                  const isBlocking =
                    field.blockingValue &&
                    val !== undefined &&
                    val !== null &&
                    val.toString().toLowerCase() === field.blockingValue.toLowerCase();

                  if (field.type === "table") {
                    const rows = Array.isArray(val) ? val : [];
                    return (
                      <div key={field.id} className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Table className="h-4 w-4 text-primary" /> {field.label}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleAddTableRow(field.id, field.columns)}
                          >
                            + Ajouter une ligne
                          </Button>
                        </div>

                        {rows.length > 0 ? (
                          <div className="overflow-x-auto rounded-md border border-border bg-background">
                            <table className="w-full text-xs text-left border-collapse">
                              <thead>
                                <tr className="bg-muted border-b border-border text-muted-foreground font-semibold">
                                  {field.columns?.map((col) => (
                                    <th key={col.id} className="p-2">
                                      {col.label} {col.unit ? `(${col.unit})` : ""}
                                    </th>
                                  ))}
                                  <th className="p-2 w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row: any, rIdx: number) => (
                                  <tr key={row._id || rIdx} className="border-b border-border/50 last:border-0">
                                    {field.columns?.map((col) => (
                                      <td key={col.id} className="p-1.5">
                                        {col.type === "yes_no" ? (
                                          <select
                                            value={row[col.id] || ""}
                                            onChange={(e) => handleUpdateTableRow(field.id, rIdx, col.id, e.target.value)}
                                            className="w-full h-7 rounded border border-input bg-background px-2 text-xs"
                                          >
                                            <option value="">--</option>
                                            <option value="oui">Oui</option>
                                            <option value="non">Non</option>
                                          </select>
                                        ) : col.type === "number" ? (
                                          <Input
                                            type="number"
                                            value={row[col.id] || ""}
                                            onChange={(e) => handleUpdateTableRow(field.id, rIdx, col.id, e.target.value)}
                                            className="h-7 text-xs"
                                          />
                                        ) : (
                                          <Input
                                            type="text"
                                            value={row[col.id] || ""}
                                            onChange={(e) => handleUpdateTableRow(field.id, rIdx, col.id, e.target.value)}
                                            className="h-7 text-xs"
                                          />
                                        )}
                                      </td>
                                    ))}
                                    <td className="p-1.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveTableRow(field.id, rIdx)}
                                        className="text-muted-foreground hover:text-destructive text-xs"
                                      >
                                        ✕
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Aucune ligne ajoutée. Cliquez sur "+ Ajouter une ligne".</p>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={field.id}
                      className={`rounded-lg border p-3 text-xs space-y-1.5 ${
                        isBlocking
                          ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                          : val
                          ? "border-border bg-card"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">
                          {field.label} {field.required && <span className="text-destructive">*</span>}
                        </span>

                        <div>
                          {field.type === "yes_no" ? (
                            <div className="flex rounded-md border border-input p-0.5 bg-background">
                              <button
                                type="button"
                                onClick={() => handleCustomFieldValueChange(field.id, "oui")}
                                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                                  val === "oui" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                OUI
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCustomFieldValueChange(field.id, "non")}
                                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                                  val === "non" ? "bg-red-600 text-white" : "text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                NON
                              </button>
                            </div>
                          ) : field.type === "select" ? (
                            <select
                              value={val || ""}
                              onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
                              className="rounded-md border border-input bg-background px-2.5 py-1 text-xs"
                            >
                              <option value="">Sélectionner...</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.type === "number" ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="any"
                                value={val || ""}
                                onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
                                className="h-7 w-28 text-xs font-mono"
                                placeholder="Valeur"
                              />
                              {field.unit && <span className="text-xs text-muted-foreground font-mono">{field.unit}</span>}
                            </div>
                          ) : field.type === "textarea" ? (
                            <Textarea
                              value={val || ""}
                              onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
                              rows={2}
                              className="w-full text-xs"
                              placeholder="Renseignez les détails..."
                            />
                          ) : (
                            <Input
                              type="text"
                              value={val || ""}
                              onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
                              className="h-7 w-48 text-xs"
                              placeholder="Saisir valeur"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MESURES AVANT / PENDANT / APRÈS */}
      {activeTab === "phases" && (
        <div className="space-y-6">
          {/* AVANT */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              1. Mesures Préalables (AVANT l'intervention)
            </h4>
            <div className="space-y-2">
              {beforeMeasures.map((m) => (
                <label key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5 hover:bg-muted/40 cursor-pointer text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={m.checked}
                      onChange={() => handleBeforeToggle(m.id)}
                      className="rounded border-input text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className={m.checked ? "font-medium text-foreground" : "text-muted-foreground"}>{m.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.checked ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}>
                    {m.checked ? "🟢 CONFORME" : "🟠 À VÉRIFIER"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* PENDANT */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              2. Surveillance en cours d'exécution (PENDANT)
            </h4>
            <div className="space-y-2">
              {duringMeasures.map((m) => (
                <label key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5 hover:bg-muted/40 cursor-pointer text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={m.checked}
                      onChange={() => handleDuringToggle(m.id)}
                      className="rounded border-input text-blue-600 focus:ring-blue-500"
                    />
                    <span className={m.checked ? "font-medium text-foreground" : "text-muted-foreground"}>{m.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.checked ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}>
                    {m.checked ? "🟢 CONFORME" : "🟠 À VÉRIFIER"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* APRÈS */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              3. Contrôle & Remise en état (APRÈS les travaux)
            </h4>
            <div className="space-y-2">
              {afterMeasures.map((m) => (
                <label key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5 hover:bg-muted/40 cursor-pointer text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={m.checked}
                      onChange={() => handleAfterToggle(m.id)}
                      className="rounded border-input text-purple-600 focus:ring-purple-500"
                    />
                    <span className={m.checked ? "font-medium text-foreground" : "text-muted-foreground"}>{m.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.checked ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}>
                    {m.checked ? "🟢 CONFORME" : "🟠 À VÉRIFIER"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EPI */}
      {activeTab === "epi" && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Équipements de Protection Individuelle Requis</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Cochez tous les EPI strictement obligatoires pour ce permis.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {availableEpiList.map((epi) => {
              const isSelected = selectedEpi.includes(epi.id);
              return (
                <div
                  key={epi.id}
                  onClick={() => toggleEpi(epi.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-xs transition-colors ${
                    isSelected ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-accent"
                  }`}
                >
                  <span className="text-foreground">{epi.label}</span>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EMERGENCY PLAN TAB */}
      {activeTab === "emergency" && (
        <div className="space-y-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <div>
            <h4 className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-2">
              <LifeBuoy className="h-4 w-4" />
              Plan de Secours, Évacuation & Dispositifs d&apos;Urgence
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Consignez les procédures spécifiques d&apos;alerte, d&apos;évacuation, la localisation des moyens de secours (extincteurs, rince-œil, kit pollution) et les numéros d&apos;urgence.
            </p>
          </div>

          <Textarea
            value={emergencyText}
            onChange={(e) => handleEmergencyChange(e.target.value)}
            placeholder="Ex : Numéros d'urgence : Pompiers 18 / Infirmerie Poste 404. Moyen d'extraction trépied prêt à l'entrée. Rondier vigile incendie positionné avec extincteur 6kg CO2..."
            rows={4}
            className="text-xs bg-background"
          />
        </div>
      )}
    </div>
  );
}
