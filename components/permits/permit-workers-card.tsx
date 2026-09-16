"use client";

import { useState, useTransition } from "react";
import {
  addWorkPermitWorker,
  deleteWorkPermitWorker,
  acknowledgeWorkPermitWorker,
  refuseWorkPermitWorkerAcknowledgement,
} from "@/lib/services/permits.service";
import type { WorkPermitWorker } from "@/lib/types/permits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Shield, CheckCircle2 } from "lucide-react";

export function PermitWorkersCard({
  permitId,
  workers,
  canManage,
}: {
  permitId: string;
  workers: WorkPermitWorker[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [workerName, setWorkerName] = useState("");
  const [roleOrQualification, setRoleOrQualification] = useState("");
  const [activeRefuseId, setActiveRefuseId] = useState<string | null>(null);
  const [refuseReason, setRefuseReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const acknowledgedCount = workers.filter((w) => w.acknowledgementStatus === "acknowledged").length;
  const totalCount = workers.length;

  function handleAddWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!workerName.trim()) return;
    setError(null);

    startTransition(async () => {
      const res = await addWorkPermitWorker({
        permitId,
        workerName: workerName.trim(),
        roleOrQualification: roleOrQualification.trim() || "Intervenant habilité",
      });

      if (res.error) {
        setError(res.error);
      } else {
        setWorkerName("");
        setRoleOrQualification("");
        setShowAddForm(false);
      }
    });
  }

  function handleDeleteWorker(workerId: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteWorkPermitWorker(workerId, permitId);
      if (res.error) {
        setError(res.error);
      }
    });
  }

  function handleAcknowledge(workerRecordId: string) {
    setError(null);
    startTransition(async () => {
      const res = await acknowledgeWorkPermitWorker({ workerRecordId, permitId });
      if (res.error) {
        setError(res.error);
      }
    });
  }

  function handleRefuseAcknowledgement(workerRecordId: string) {
    if (!refuseReason.trim()) {
      setError("Le motif du refus d'émargement est obligatoire.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await refuseWorkPermitWorkerAcknowledgement({
        workerRecordId,
        permitId,
        reason: refuseReason,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setActiveRefuseId(null);
        setRefuseReason("");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Équipe d&apos;Intervenants & Émargement Individuel ({workers.length})
        </CardTitle>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <Badge variant={acknowledgedCount === totalCount ? "success" : "warning"} className="text-xs">
              Émargés : {acknowledgedCount} / {totalCount}
            </Badge>
          )}
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Ajouter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {error && <p className="text-destructive text-xs font-medium">{error}</p>}

        {showAddForm && (
          <form onSubmit={handleAddWorker} className="bg-muted/30 p-3 rounded-md space-y-2 border border-border">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-medium block text-muted-foreground mb-1">
                  Nom & Prénom de l&apos;intervenant *
                </label>
                <Input
                  size={1}
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder="Ex: Mamadou Diop"
                  className="text-xs h-8"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-medium block text-muted-foreground mb-1">
                  Rôle / Habilitation (ex: Électricien H0V)
                </label>
                <Input
                  size={1}
                  value={roleOrQualification}
                  onChange={(e) => setRoleOrQualification(e.target.value)}
                  placeholder="Ex: Technicien Consignation LOTO"
                  className="text-xs h-8"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setShowAddForm(false)}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" className="h-7 text-xs" disabled={isPending}>
                Enregistrer l&apos;intervenant
              </Button>
            </div>
          </form>
        )}

        {workers.length === 0 ? (
          <p className="text-muted-foreground text-center py-3 bg-muted/10 rounded-md">
            Aucun intervenant spécifique enregistré dans le registre d&apos;équipe.
          </p>
        ) : (
          <div className="space-y-2">
            {workers.map((worker) => {
              const isAcked = worker.acknowledgementStatus === "acknowledged";
              const isRefused = worker.acknowledgementStatus === "refused";
              const isPendingAck = worker.acknowledgementStatus === "pending" || !worker.acknowledgementStatus;

              return (
                <div
                  key={worker.id}
                  className={`p-3 rounded-md border text-xs space-y-2 transition-all ${
                    isAcked
                      ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20"
                      : isRefused
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-foreground block">{worker.workerName}</span>
                        {worker.roleOrQualification && (
                          <span className="text-muted-foreground text-[11px] block">
                            {worker.roleOrQualification}
                          </span>
                        )}
                        {worker.acknowledgedAt && (
                          <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                            Émargé le {new Date(worker.acknowledgedAt).toLocaleString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAcked ? (
                        <Badge variant="success" className="text-[10px]">
                          ✓ Accusé
                        </Badge>
                      ) : isRefused ? (
                        <Badge variant="destructive" className="text-[10px]">
                          ✕ Refusé
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px]">
                          ○ En attente d&apos;émargement
                        </Badge>
                      )}

                      {canManage && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          disabled={isPending}
                          onClick={() => handleDeleteWorker(worker.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {isRefused && worker.rejectionReason && (
                    <p className="text-[11px] text-destructive bg-destructive/10 p-2 rounded border border-destructive/20 font-medium">
                      Motif du refus d&apos;émargement : {worker.rejectionReason}
                    </p>
                  )}

                  {isPendingAck && (
                    <div className="pt-2 border-t border-border flex items-center gap-2">
                      {activeRefuseId === worker.id ? (
                        <div className="w-full space-y-2">
                          <Input
                            size={1}
                            value={refuseReason}
                            onChange={(e) => setRefuseReason(e.target.value)}
                            placeholder="Motif du refus obligatoires..."
                            className="text-xs h-8"
                          />
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => {
                                setActiveRefuseId(null);
                                setRefuseReason("");
                              }}
                              disabled={isPending}
                            >
                              Annuler
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => handleRefuseAcknowledgement(worker.id)}
                              disabled={isPending || !refuseReason.trim()}
                            >
                              Confirmer Refus
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 w-full justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            onClick={() => handleAcknowledge(worker.id)}
                            disabled={isPending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Accuser réception
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => setActiveRefuseId(worker.id)}
                            disabled={isPending}
                          >
                            Refuser
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
