"use client";

import { useState, useTransition } from "react";
import { addWorkPermitWorker, deleteWorkPermitWorker } from "@/lib/services/permits.service";
import type { WorkPermitWorker } from "@/lib/types/permits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Trash2, Shield } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Équipe d&apos;Intervenants & Qualifications ({workers.length})
        </CardTitle>
        {canManage && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajouter un intervenant
          </Button>
        )}
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
                  Rôle / Habilitation (ex: Électricien H0V, CQP)
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
          <div className="space-y-1.5">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-border"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div>
                    <span className="font-medium text-foreground block">{worker.workerName}</span>
                    {worker.roleOrQualification && (
                      <span className="text-muted-foreground text-[11px] block">
                        {worker.roleOrQualification}
                      </span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={isPending}
                    onClick={() => handleDeleteWorker(worker.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
