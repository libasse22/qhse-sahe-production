"use client";

import { useState, useTransition } from "react";
import { updateActionStatus } from "@/lib/services/actions.service";
import { Select } from "@/components/ui/select";
import { ACTION_STATUS_LABELS, ACTION_STATUS_ORDER, type ActionStatus } from "@/lib/types/actions";

export function ActionStatusSelect({
  actionId,
  incidentId,
  status,
}: {
  actionId: string;
  incidentId: string;
  status: ActionStatus;
}) {
  const [value, setValue] = useState<ActionStatus>(status);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(newStatus: ActionStatus) {
    setValue(newStatus);
    setError(null);
    startTransition(async () => {
      const result = await updateActionStatus(actionId, incidentId, newStatus);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      <Select
        value={value}
        onChange={(e) => handleChange(e.target.value as ActionStatus)}
        disabled={isPending}
        className="h-9 text-sm"
      >
        {ACTION_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {ACTION_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
