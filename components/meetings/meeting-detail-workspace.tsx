"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Plus,
  Play,
  FileCheck,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  CheckSquare,
  Square,
  History,
} from "lucide-react";
import type { MeetingDetails, MeetingStatus, AttendanceStatus } from "@/lib/types/meeting";
import { MEETING_TYPE_LABELS, MEETING_STATUS_LABELS, ATTENDANCE_STATUS_LABELS } from "@/lib/types/meeting";
import { updateMeetingStatus, addMeetingDecision, confirmAndCreateMeetingActions } from "@/lib/services/meetings.service";
import { GeneratePVModal } from "@/components/meetings/generate-pv-modal";
import { PrepareMeetingModal } from "@/components/meetings/prepare-meeting-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export function MeetingDetailWorkspace({
  details,
  canManage,
}: {
  details: MeetingDetails;
  canManage: boolean;
}) {
  const router = useRouter();
  const { meeting: m, participants, agendaItems, decisions, actionItems, history, documentUrl } = details;

  const [activeTab, setActiveTab] = useState<"agenda" | "notes" | "decisions" | "actions" | "pv" | "history">("agenda");

  const [isGeneratePVOpen, setIsGeneratePVOpen] = useState(false);
  const [isPrepareOpen, setIsPrepareOpen] = useState(false);

  // Formulaire décision rapide
  const [newDecisionText, setNewDecisionText] = useState("");
  const [isAddingDecision, setIsAddingDecision] = useState(false);

  // Formulaire action rapide
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newActionDesc, setNewActionDesc] = useState("");
  const [newActionDueDate, setNewActionDueDate] = useState("");
  const [createAsCapa, setCreateAsCapa] = useState(false);
  const [isAddingAction, setIsAddingAction] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(newStatus: MeetingStatus) {
    setError(null);
    startTransition(async () => {
      const res = await updateMeetingStatus(m.id, newStatus);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleAddDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!newDecisionText.trim()) return;

    setError(null);
    startTransition(async () => {
      const res = await addMeetingDecision({
        meetingId: m.id,
        decisionText: newDecisionText.trim(),
      });

      if (res.error) {
        setError(res.error);
      } else {
        setNewDecisionText("");
        setIsAddingDecision(false);
        router.refresh();
      }
    });
  }

  function handleAddAction(e: React.FormEvent) {
    e.preventDefault();
    if (!newActionTitle.trim()) return;

    setError(null);
    startTransition(async () => {
      const res = await confirmAndCreateMeetingActions(m.id, [
        {
          title: newActionTitle.trim(),
          description: newActionDesc.trim() || undefined,
          dueDate: newActionDueDate || undefined,
          createAsCapa,
        },
      ]);

      if (res.error) {
        setError(res.error);
      } else {
        setNewActionTitle("");
        setNewActionDesc("");
        setNewActionDueDate("");
        setCreateAsCapa(false);
        setIsAddingAction(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Navigation Retour */}
      <div>
        <Link href="/reunions" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-sky-600 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour au registre des réunions
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200">{error}</div>
      )}

      {/* EN-TETE FICHE REUNION */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-900">
                {m.reference}
              </span>
              <Badge variant="outline">{MEETING_TYPE_LABELS[m.meetingType] || m.meetingType}</Badge>
              <Badge variant={m.status === "en_cours" ? "warning" : m.status === "validee" || m.status === "signee" ? "success" : "secondary"}>
                {MEETING_STATUS_LABELS[m.status] || m.status}
              </Badge>
            </div>

            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{m.title}</h1>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(m.scheduledAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {m.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {m.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Organisateur : {m.organizerName || "Non spécifié"}
              </span>
            </div>
          </div>

          {/* ACTIONS WORKFLOW REUNION */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setIsPrepareOpen(true)} className="gap-1.5 text-xs text-amber-600 border-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Suggestions Ordre du jour
            </Button>

            {canManage && (
              <>
                {m.status === "planifiee" && (
                  <Button size="sm" onClick={() => handleStatusChange("en_cours")} disabled={isPending} className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs">
                    <Play className="w-3.5 h-3.5" />
                    Démarrer Séance
                  </Button>
                )}

                {(m.status === "en_cours" || m.status === "pv_a_valider") && (
                  <Button size="sm" onClick={() => setIsGeneratePVOpen(true)} disabled={isPending} className="bg-sky-600 hover:bg-sky-700 text-white gap-1.5 text-xs">
                    <FileCheck className="w-3.5 h-3.5" />
                    Générer & Déposer PV GED
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* PARTICIPANTS QUICK SUMMARY */}
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Participants ({participants.length}) :</span>
          {participants.map((p) => (
            <span key={p.id} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
              {p.fullName} ({ATTENDANCE_STATUS_LABELS[p.attendanceStatus]})
            </span>
          ))}
        </div>
      </div>

      {/* TABS WORKSPACE */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("agenda")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "agenda" ? "border-sky-600 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Ordre du jour ({agendaItems.length})
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "notes" ? "border-sky-600 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Notes & Échanges
        </button>
        <button
          onClick={() => setActiveTab("decisions")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "decisions" ? "border-sky-600 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Décisions ({decisions.length})
        </button>
        <button
          onClick={() => setActiveTab("actions")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "actions" ? "border-sky-600 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Plan d'actions ({actionItems.length})
        </button>
        <button
          onClick={() => setActiveTab("pv")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "pv" ? "border-sky-600 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          PV & Moteur GED
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "history" ? "border-sky-600 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Historique Audit ({history.length})
        </button>
      </div>

      {/* CONTENU TABS */}
      {activeTab === "agenda" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Points à l'Ordre du Jour</h3>
            <Button size="sm" variant="outline" onClick={() => setIsPrepareOpen(true)} className="gap-1 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Ajouter des sujets suggérés
            </Button>
          </div>

          <div className="space-y-2">
            {agendaItems.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 text-center">
                Aucun point à l'ordre du jour. Utilisez "Suggestions Ordre du jour" pour ajouter les sujets prioritaires.
              </p>
            ) : (
              agendaItems.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {item.position}. {item.title}
                    </span>
                    {item.description && <p className="text-slate-500">{item.description}</p>}
                  </div>
                  {item.sourceType && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      Source : {item.sourceType}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "notes" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Prise de Notes & Synthèse de Séance</h3>
          <p className="text-xs text-slate-500">
            Ces notes seront intégrées automatiquement lors de la génération du Procès-Verbal dans la GED.
          </p>
          <Textarea
            value={m.notes || ""}
            placeholder="Saisir les échanges, débats et remarques de séance..."
            rows={10}
            className="text-xs"
            readOnly={!canManage}
          />
        </div>
      )}

      {activeTab === "decisions" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Décisions Prises en Réunion</h3>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setIsAddingDecision(true)} className="gap-1 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Nouvelle décision
              </Button>
            )}
          </div>

          {isAddingDecision && (
            <form onSubmit={handleAddDecision} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 space-y-3 text-xs">
              <Input
                value={newDecisionText}
                onChange={(e) => setNewDecisionText(e.target.value)}
                placeholder="Texte explicite de la décision..."
                required
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingDecision(false)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  Enregistrer Décision
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-2 text-xs">
            {decisions.length === 0 ? (
              <p className="text-slate-500 italic p-4 text-center">Aucune décision enregistrée.</p>
            ) : (
              decisions.map((d) => (
                <div key={d.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">✓ {d.decisionText}</div>
                  {d.responsibleName && <div className="text-[10px] text-slate-500">Responsable : {d.responsibleName}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "actions" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Plan d'Actions de la Réunion</h3>
              <p className="text-xs text-slate-500">Confirmation humaine obligatoire avant création dans le moteur CAPA</p>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddingAction(true)} className="gap-1 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Ajouter une action
              </Button>
            )}
          </div>

          {isAddingAction && (
            <form onSubmit={handleAddAction} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 space-y-3 text-xs">
              <Input
                value={newActionTitle}
                onChange={(e) => setNewActionTitle(e.target.value)}
                placeholder="Intitulé de l'action..."
                required
              />
              <Input
                value={newActionDesc}
                onChange={(e) => setNewActionDesc(e.target.value)}
                placeholder="Description détaillée (optionnelle)..."
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={newActionDueDate}
                  onChange={(e) => setNewActionDueDate(e.target.value)}
                />
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createAsCapa}
                    onChange={(e) => setCreateAsCapa(e.target.checked)}
                    className="rounded"
                  />
                  <span>Créer également dans les CAPA centralisées</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingAction(false)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  Confirmer et Créer Action
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-2 text-xs">
            {actionItems.length === 0 ? (
              <p className="text-slate-500 italic p-4 text-center">Aucune action rattachée à cette réunion.</p>
            ) : (
              actionItems.map((a) => (
                <div key={a.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{a.title}</span>
                    {a.description && <p className="text-slate-500">{a.description}</p>}
                    <div className="text-[10px] text-slate-400">
                      Échéance: {a.dueDate || "Non précisée"} · Priorité: {a.priority.toUpperCase()}
                    </div>
                  </div>
                  {a.actionId ? (
                    <Link href="/actions">
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        CAPA liée
                      </Badge>
                    </Link>
                  ) : (
                    <Badge variant="outline">Action de Séance</Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "pv" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-600" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Procès-Verbal Rattaché à la GED (Master Document)
              </h3>
            </div>
            {m.documentId ? (
              <Link href={`/documents/${m.documentId}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                  Consulter dans la GED
                </Button>
              </Link>
            ) : (
              <Button size="sm" onClick={() => setIsGeneratePVOpen(true)} className="bg-sky-600 text-white gap-1.5 text-xs">
                <FileCheck className="w-3.5 h-3.5" />
                Générer & Déposer le PV
              </Button>
            )}
          </div>

          {documentUrl ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Le procès-verbal officiel a été généré et rattaché sous la référence GED officielle. Les circuits d'approbation et d'archivage sont gérés par le moteur documentaire ISO.
              </p>
              <a
                href={documentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 dark:bg-sky-950/50 px-3 py-2 rounded-lg border border-sky-200 dark:border-sky-900"
              >
                <FileText className="w-4 h-4" />
                Télécharger / Ouvrir le PV généré (HTML / GED)
              </a>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 italic space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Aucun procès-verbal publié pour cette réunion.</p>
              <p>Cliquez sur "Générer & Déposer le PV" pour convertir automatiquement l'ordre du jour et les notes en Master Document GED.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 text-xs">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Journal d'Audit Immuable de la Réunion
          </h3>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{h.eventType}</span> par{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300">{h.actorName}</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {new Date(h.createdAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      <GeneratePVModal
        meetingId={m.id}
        initialNotes={m.notes}
        isOpen={isGeneratePVOpen}
        onClose={() => setIsGeneratePVOpen(false)}
      />

      <PrepareMeetingModal
        meetingId={m.id}
        isOpen={isPrepareOpen}
        onClose={() => setIsPrepareOpen(false)}
      />
    </div>
  );
}
