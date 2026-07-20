"use client";

import { useState, useTransition } from "react";
import { updateAuditStatus } from "@/lib/services/audits.service";
import { Select } from "@/components/ui/select";
import { AUDIT_STATUS_LABELS, AUDIT_STATUS_ORDER, type AuditStatus } from "@/lib/types/audit";

export function AuditStatusSelect({ auditId, status }: { auditId: string; status: AuditStatus }) {
  const [value, setValue] = useState<AuditStatus>(status);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(newStatus: AuditStatus) {
    setValue(newStatus);
    setError(null);
    startTransition(async () => {
      const result = await updateAuditStatus(auditId, newStatus);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="w-52">
      <Select value={value} onChange={(e) => handleChange(e.target.value as AuditStatus)} disabled={isPending}>
        {AUDIT_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {AUDIT_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
