"use client";

import { useState, useTransition } from "react";
import { updateIncidentStatus } from "@/lib/services/incidents.service";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { STATUS_LABELS, STATUS_ORDER, type IncidentStatus } from "@/lib/types/incidents";
import type { Profile } from "@/lib/types/auth";

interface StatusControlProps {
  incidentId: string;
  currentStatus: IncidentStatus;
  currentAssignedTo: string | null;
  assignableUsers: Profile[];
}

export function StatusControl({
  incidentId,
  currentStatus,
  currentAssignedTo,
  assignableUsers,
}: StatusControlProps) {
  const [status, setStatus] = useState<IncidentStatus>(currentStatus);
  const [assignedTo, setAssignedTo] = useState<string>(currentAssignedTo ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateIncidentStatus(incidentId, status, assignedTo || null);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="status">Statut</Label>
        <Select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as IncidentStatus)}
          disabled={isPending}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignedTo">Assigné à</Label>
        <Select
          id="assignedTo"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          disabled={isPending}
        >
          <option value="">Non assigné</option>
          {assignableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName || u.email}
            </option>
          ))}
        </Select>
      </div>

      <Button onClick={handleSave} disabled={isPending} size="sm" className="w-full">
        {isPending ? "Enregistrement…" : "Mettre à jour"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && !error && <p className="text-xs text-emerald-700">Modifications enregistrées.</p>}
    </div>
  );
}
