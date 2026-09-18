"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CheckSquare, Square, X } from "lucide-react";
import type { MeetingSuggestion } from "@/lib/types/meeting";
import { prepareMeetingSuggestions, addAgendaItemsFromSuggestions } from "@/lib/services/meetings.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PrepareMeetingModalProps {
  meetingId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectSuggestionsForNewMeeting?: (selectedTitles: string[]) => void;
}

export function PrepareMeetingModal({
  meetingId,
  isOpen,
  onClose,
  onSelectSuggestionsForNewMeeting,
}: PrepareMeetingModalProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<MeetingSuggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      prepareMeetingSuggestions()
        .then((res) => {
          setSuggestions(res);
          // Par défaut sélectionner les urgences
          const urgentSet = new Set(
            res.filter((s) => s.badgeVariant === "destructive" || s.badgeVariant === "warning").map((s) => s.sourceId)
          );
          setSelectedIds(urgentSet);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddToAgenda() {
    const selectedItems = suggestions
      .filter((s) => selectedIds.has(s.sourceId))
      .map((s) => ({
        title: s.title,
        sourceType: s.sourceType,
        sourceId: s.sourceId,
        description: s.subtitle,
      }));

    if (selectedItems.length === 0) {
      setError("Veuillez sélectionner au moins un sujet à ajouter.");
      return;
    }

    if (!meetingId) {
      if (onSelectSuggestionsForNewMeeting) {
        onSelectSuggestionsForNewMeeting(selectedItems.map((s) => s.title));
      }
      onClose();
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await addAgendaItemsFromSuggestions(meetingId, selectedItems);
      if (res.error) {
        setError(res.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                Préparation Intelligente Réunion QHSE
              </h3>
              <p className="text-xs text-slate-500">
                Suggestions automatiques extraites des données réelles de l'entreprise
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2">
              <Sparkles className="w-6 h-6 text-amber-500 mx-auto animate-spin" />
              <p>Analyse des indicateurs Cockpit, CAPA en retard et Incidents récents...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Aucun sujet critique ou action en retard détecté dans l'entreprise.
            </div>
          ) : (
            suggestions.map((item) => {
              const isSelected = selectedIds.has(item.sourceId);
              return (
                <div
                  key={item.sourceId}
                  onClick={() => toggleSelect(item.sourceId)}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
                      : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="mt-0.5 text-amber-600">
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                        {item.title}
                      </span>
                      <Badge variant={item.badgeVariant} className="text-[10px]">
                        {item.badgeText}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{item.subtitle}</p>
                    {item.responsibleName && (
                      <div className="text-[10px] text-slate-500">Responsable : {item.responsibleName}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium">
            {selectedIds.size} sujet(s) sélectionné(s)
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleAddToAgenda} disabled={isPending || selectedIds.size === 0}>
              {isPending ? "Ajout en cours..." : "Ajouter à l'Ordre du Jour"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
