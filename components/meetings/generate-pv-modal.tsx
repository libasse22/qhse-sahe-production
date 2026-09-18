"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, ShieldCheck, X, FileCheck, Edit3 } from "lucide-react";
import { publishPVToGED } from "@/lib/services/meetings.service";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface GeneratePVModalProps {
  meetingId: string;
  initialNotes?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function GeneratePVModal({ meetingId, initialNotes, isOpen, onClose }: GeneratePVModalProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes || "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const res = await publishPVToGED(meetingId, notes.trim());
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
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
              Générer et Publier le Procès-Verbal (PV)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200">{error}</div>
        )}

        <div className="space-y-3">
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 rounded-lg text-xs text-sky-900 dark:text-sky-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              Intégration Moteur GED Master Document
            </div>
            <p>
              Le PV sera généré automatiquement avec la mise en page ISO officielle, les participants, l'ordre du jour, les décisions et le tableau d'actions. Il sera rattaché à la GED entreprise pour contrôle et signature.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              Synthèse des discussions & Notes complémentaires de la réunion
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Saisissez ou modifiez les remarques et échanges de la réunion..."
              rows={8}
              className="text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handlePublish} disabled={isPending} className="bg-sky-600 hover:bg-sky-700 text-white gap-1.5">
            <FileCheck className="w-4 h-4" />
            {isPending ? "Génération & Intégration GED..." : "Valider & Déposer PV dans la GED"}
          </Button>
        </div>
      </div>
    </div>
  );
}
