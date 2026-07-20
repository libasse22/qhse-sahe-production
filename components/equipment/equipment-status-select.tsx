"use client";

import { useState, useTransition } from "react";
import { updateEquipmentStatus } from "@/lib/services/equipment.service";
import { Select } from "@/components/ui/select";
import { EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_ORDER, type EquipmentStatus } from "@/lib/types/equipment";

export function EquipmentStatusSelect({ equipmentId, status }: { equipmentId: string; status: EquipmentStatus }) {
  const [value, setValue] = useState<EquipmentStatus>(status);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(newStatus: EquipmentStatus) {
    setValue(newStatus);
    setError(null);
    startTransition(async () => {
      const result = await updateEquipmentStatus(equipmentId, newStatus);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      <Select value={value} onChange={(e) => handleChange(e.target.value as EquipmentStatus)} disabled={isPending} className="h-9 w-44 text-sm">
        {EQUIPMENT_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {EQUIPMENT_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
