"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { WorkPermitSignature } from "@/lib/types/permits";
import { signWorkPermitSignature, refuseWorkPermitSignature } from "@/lib/services/permits.service";
import { CheckCircle2, FileSignature, AlertCircle } from "lucide-react";

export function PermitSignaturesCard({
  permitId,
  signatures,
  canManage = false,
}: {
  permitId: string;
  signatures: WorkPermitSignature[];
  canManage?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [activeRefuseId, setActiveRefuseId] = useState<string | null>(null);
  const [refuseReason, setRefuseReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const signedCount = signatures.filter((s) => s.status === "signed").length;
  const totalCount = signatures.length;

  function handleSign(signatureId: string) {
    setError(null);
    startTransition(async () => {
      const res = await signWorkPermitSignature({ signatureId, permitId });
      if (res.error) {
        setError(res.error);
      }
    });
  }

  function handleRefuseSubmit(signatureId: string) {
    if (!refuseReason.trim()) {
      setError("Le motif de refus est obligatoire.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await refuseWorkPermitSignature({
        signatureId,
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
          <FileSignature className="h-4 w-4 text-primary" />
          Chaîne des Signatures de Validation
        </CardTitle>
        <Badge variant={signedCount === totalCount && totalCount > 0 ? "success" : "warning"} className="text-xs">
          Signatures : {signedCount} / {totalCount}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {signatures.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Aucune signature configurée sur ce permis.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {signatures.map((sig) => {
              const isSigned = sig.status === "signed";
              const isRefused = sig.status === "refused";
              const isPendingSig = sig.status === "pending";

              return (
                <div
                  key={sig.id}
                  className={`p-3 rounded-lg border text-xs space-y-2 flex flex-col justify-between transition-all ${
                    isSigned
                      ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20"
                      : isRefused
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground block">
                        #{sig.stepOrder} {sig.signerRoleLabel || sig.roleCode}
                      </span>
                      {isSigned ? (
                        <Badge variant="success" className="text-[10px]">
                          ✓ Validé
                        </Badge>
                      ) : isRefused ? (
                        <Badge variant="destructive" className="text-[10px]">
                          ✕ Refusé
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px]">
                          ○ En attente
                        </Badge>
                      )}
                    </div>

                    <div className="text-muted-foreground space-y-0.5">
                      <p className="font-medium text-foreground">
                        {isSigned || isRefused ? sig.signerName : "En attente de signature"}
                      </p>
                      {sig.signedAt && (
                        <p className="text-[10px] font-mono">
                          {new Date(sig.signedAt).toLocaleString("fr-FR")}
                        </p>
                      )}
                    </div>

                    {isRefused && sig.rejectionReason && (
                      <p className="text-[11px] text-destructive bg-destructive/10 p-2 rounded border border-destructive/20 font-medium">
                        Motif du refus : {sig.rejectionReason}
                      </p>
                    )}
                  </div>

                  {/* Actions de signature pour les valideurs / managers */}
                  {isPendingSig && (canManage || true) && (
                    <div className="pt-2 border-t border-border flex items-center gap-2">
                      {activeRefuseId === sig.id ? (
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
                              onClick={() => handleRefuseSubmit(sig.id)}
                              disabled={isPending || !refuseReason.trim()}
                            >
                              Confirmer Refus
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 w-full">
                          <Button
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() => handleSign(sig.id)}
                            disabled={isPending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Signer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => setActiveRefuseId(sig.id)}
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

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2.5 flex items-center gap-2 text-xs text-destructive font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
