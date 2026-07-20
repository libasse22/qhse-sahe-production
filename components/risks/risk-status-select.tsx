"use client";

import { useState, useTransition } from "react";
import { updateRiskStatus } from "@/lib/services/risks.service";
import { Select } from "@/components/ui/select";
import { RISK_STATUS_LABELS, RISK_STATUS_ORDER, type RiskStatus } from "@/lib/types/risk";

export function RiskStatusSelect({ riskId, status }: { riskId: string; status: RiskStatus }) {
  const [value, setValue] = useState<RiskStatus>(status);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(newStatus: RiskStatus) {
    setValue(newStatus);
    setError(null);
    startTransition(async () => {
      const result = await updateRiskStatus(riskId, newStatus);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="w-40">
      <Select value={value} onChange={(e) => handleChange(e.target.value as RiskStatus)} disabled={isPending} className="h-9 text-sm">
        {RISK_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {RISK_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
