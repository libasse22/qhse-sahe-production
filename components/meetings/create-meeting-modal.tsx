"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, Users, X, Plus, Trash2, FileText } from "lucide-react";
import type { MeetingType } from "@/lib/types/meeting";
import { MEETING_TYPE_LABELS } from "@/lib/types/meeting";
import { createMeeting } from "@/lib/services/meetings.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateMeetingModal({ isOpen, onClose, onSuccess }: CreateMeetingModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState<MeetingType>("qhse");
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [agendaTitles, setAgendaTitles] = useState<string[]>(["Validation PV précédent", "Suivi des actions CAPA"]);
  const [newAgendaTitle, setNewAgendaTitle] = useState("");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleAddAgendaItem() {
    if (!newAgendaTitle.trim()) return;
    setAgendaTitles((prev) => [...prev, newAgendaTitle.trim()]);
    setNewAgendaTitle("");
  }

  function handleRemoveAgendaItem(idx: number) {
    setAgendaTitles((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) {
      setError("Le titre et la date/heure de la réunion sont obligatoires.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await createMeeting({
        title: title.trim(),
        meetingType,
        scheduledAt,
        location: location.trim(),
        description: description.trim(),
        initialAgendaTitles: agendaTitles,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onSuccess?.();
        onClose();
        if (res.meetingId) {
          router.push(`/reunions/${res.meetingId}`);
        } else {
          router.refresh();
        }
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
              Planifier une Réunion QHSE
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Titre de la réunion *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Comité HSE Mensuel / Revue de Direction Q1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Type de Réunion *
              </label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as MeetingType)}
                className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
              >
                {Object.entries(MEETING_TYPE_LABELS).map(([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date et Heure *
              </label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lieu / Emplacement
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ex: Salle de conférence B / Visioconférence Teams"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ordre du Jour Initial
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newAgendaTitle}
                  onChange={(e) => setNewAgendaTitle(e.target.value)}
                  placeholder="Ajouter un sujet..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAgendaItem())}
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddAgendaItem}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-1">
                {agendaTitles.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <span>{idx + 1}. {item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAgendaItem(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Création & Codification..." : "Planifier Réunion"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
