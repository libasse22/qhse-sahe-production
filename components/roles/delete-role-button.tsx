"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteRole } from "@/lib/services/roles.service";
import { Button } from "@/components/ui/button";

export function DeleteRoleButton({ roleId }: { roleId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteRole(roleId);
      if (result.error) setError(result.error);
    });
  }

  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
        <Trash2 className="h-4 w-4" />
        Supprimer
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs">Confirmer ?</span>
      <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isPending}>
        {isPending ? "…" : "Oui, supprimer"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={isPending}>
        Annuler
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
