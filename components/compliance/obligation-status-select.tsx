"use client";

import { useState, useTransition } from "react";
import { updateComplianceStatus } from "@/lib/services/compliance.service";
import { Select } from "@/components/ui/select";
import { COMPLIANCE_STATUS_LABELS, COMPLIANCE_STATUS_ORDER, type ComplianceStatus } from "@/lib/types/compliance";

export function ObligationStatusSelect({ obligationId, status }: { obligationId: string; status: ComplianceStatus }) {
  const [value, setValue] = useState<ComplianceStatus>(status);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(newStatus: ComplianceStatus) {
    setValue(newStatus);
    setError(null);
    startTransition(async () => {
      const result = await updateComplianceStatus(obligationId, newStatus);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      <Select value={value} onChange={(e) => handleChange(e.target.value as ComplianceStatus)} disabled={isPending} className="h-9 w-36 text-sm">
        {COMPLIANCE_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {COMPLIANCE_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
