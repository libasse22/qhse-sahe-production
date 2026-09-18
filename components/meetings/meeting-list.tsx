"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Plus,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Users,
  Eye,
  ArrowRight,
  Filter,
} from "lucide-react";
import type { Meeting, MeetingType, MeetingStatus } from "@/lib/types/meeting";
import { MEETING_TYPE_LABELS, MEETING_STATUS_LABELS } from "@/lib/types/meeting";
import { CreateMeetingModal } from "@/components/meetings/create-meeting-modal";
import { PrepareMeetingModal } from "@/components/meetings/prepare-meeting-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface MeetingListProps {
  initialMeetings: Meeting[];
  canManage: boolean;
}

export function MeetingList({ initialMeetings, canManage }: MeetingListProps) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MeetingType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | "all">("all");
  const [activeTab, setActiveTab] = useState<"upcoming" | "in_progress" | "pv_validation" | "signed" | "all">("all");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPrepareModalOpen, setIsPrepareModalOpen] = useState(false);

  const filtered = meetings.filter((m) => {
    if (typeFilter !== "all" && m.meetingType !== typeFilter) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;

    if (activeTab === "upcoming" && m.status !== "planifiee") return false;
    if (activeTab === "in_progress" && m.status !== "en_cours") return false;
    if (activeTab === "pv_validation" && m.status !== "pv_a_valider") return false;
    if (activeTab === "signed" && m.status !== "validee" && m.status !== "signee") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchRef = m.reference.toLowerCase().includes(q);
      const matchLoc = (m.location || "").toLowerCase().includes(q);
      return matchTitle || matchRef || matchLoc;
    }

    return true;
  });

  const totalCount = meetings.length;
  const upcomingCount = meetings.filter((m) => m.status === "planifiee").length;
  const inProgressCount = meetings.filter((m) => m.status === "en_cours").length;
  const pvValidationCount = meetings.filter((m) => m.status === "pv_a_valider").length;
  const signedCount = meetings.filter((m) => m.status === "validee" || m.status === "signee").length;

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-6 h-6 text-sky-400" />
            <span className="text-xs font-semibold tracking-wider text-sky-300 uppercase">
              Module Traçabilité Réunions & PV QHSE
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Réunions, Comités HSE & Procès-Verbaux</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Gestion de l'ordre du jour, préparation automatique basée sur les données réelles, prise de notes, décisions et publication des PVs dans la GED.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsPrepareModalOpen(true)}
            variant="outline"
            className="bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700 gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            Préparer une réunion
          </Button>

          {canManage && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-sky-600 hover:bg-sky-700 text-white gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle réunion
            </Button>
          )}
        </div>
      </div>

      {/* COMPTEURS RAPIDES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab("upcoming")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === "upcoming" ? "bg-sky-50/80 dark:bg-sky-950/40 border-sky-400" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">À venir / Planifiées</span>
            <Calendar className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{upcomingCount}</div>
        </div>

        <div
          onClick={() => setActiveTab("in_progress")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === "in_progress" ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-400" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">En cours</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{inProgressCount}</div>
        </div>

        <div
          onClick={() => setActiveTab("pv_validation")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === "pv_validation" ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase">PV à Valider</span>
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{pvValidationCount}</div>
        </div>

        <div
          onClick={() => setActiveTab("signed")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === "signed" ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">PVs Validés & Signés</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{signedCount}</div>
        </div>
      </div>

      {/* FILTRES ET RECHERCHE */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, référence REU-2026-XXX ou lieu..."
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as MeetingType | "all")}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
            >
              <option value="all">Tous les types de réunions</option>
              {Object.entries(MEETING_TYPE_LABELS).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as MeetingStatus | "all")}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(MEETING_STATUS_LABELS).map(([st, label]) => (
                <option key={st} value={st}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLEAU DES REUNIONS */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">Référence & Titre</th>
                <th className="p-3.5">Type de Réunion</th>
                <th className="p-3.5">Date & Heure</th>
                <th className="p-3.5">Organisateur / Lieu</th>
                <th className="p-3.5">Statut</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                    Aucune réunion trouvée avec les filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  let statusBadgeVariant: "outline" | "secondary" | "warning" | "destructive" | "success" = "outline";
                  if (m.status === "en_cours") statusBadgeVariant = "warning";
                  if (m.status === "pv_a_valider") statusBadgeVariant = "secondary";
                  if (m.status === "validee" || m.status === "signee") statusBadgeVariant = "success";
                  if (m.status === "annulee") statusBadgeVariant = "destructive";

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[11px] font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-900">
                            {m.reference}
                          </span>
                          <Link
                            href={`/reunions/${m.id}`}
                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-sky-600 block line-clamp-1"
                          >
                            {m.title}
                          </Link>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <Badge variant="outline" className="text-[10px]">
                          {MEETING_TYPE_LABELS[m.meetingType] || m.meetingType}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(m.scheduledAt).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>{m.organizerName || "Organisateur non spécifié"}</span>
                          </div>
                          {m.location && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <MapPin className="w-3 h-3" />
                              <span>{m.location}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <Badge variant={statusBadgeVariant}>
                          {MEETING_STATUS_LABELS[m.status] || m.status}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-right">
                        <Link href={`/reunions/${m.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 gap-1 text-sky-600 hover:text-sky-700">
                            <Eye className="w-3.5 h-3.5" />
                            Ouvrir
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      <CreateMeetingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => setMeetings((prev) => prev)}
      />

      <PrepareMeetingModal
        isOpen={isPrepareModalOpen}
        onClose={() => setIsPrepareModalOpen(false)}
      />
    </div>
  );
}
