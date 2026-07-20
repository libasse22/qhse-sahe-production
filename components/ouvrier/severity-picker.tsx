"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncidentSeverity } from "@/lib/types/incidents";

const OPTIONS: { value: IncidentSeverity; label: string; icon: typeof CheckCircle2; className: string }[] = [
  { value: "faible", label: "Léger", icon: CheckCircle2, className: "border-emerald-300 bg-emerald-50 text-emerald-700 data-[selected=true]:bg-emerald-500 data-[selected=true]:text-white" },
  { value: "moyenne", label: "Moyen", icon: AlertTriangle, className: "border-amber-300 bg-amber-50 text-amber-700 data-[selected=true]:bg-amber-500 data-[selected=true]:text-white" },
  { value: "elevee", label: "Grave", icon: AlertOctagon, className: "border-orange-300 bg-orange-50 text-orange-700 data-[selected=true]:bg-orange-500 data-[selected=true]:text-white" },
  { value: "critique", label: "Urgence", icon: Flame, className: "border-red-300 bg-red-50 text-red-700 data-[selected=true]:bg-red-500 data-[selected=true]:text-white" },
];

export function SeverityPicker({
  defaultValue,
  onChange,
}: {
  defaultValue?: IncidentSeverity;
  onChange?: (value: IncidentSeverity) => void;
}) {
  const [selected, setSelected] = useState<IncidentSeverity>(defaultValue ?? "faible");

  function handleSelect(value: IncidentSeverity) {
    setSelected(value);
    onChange?.(value);
  }

  return (
    <div>
      <input type="hidden" name="severity" value={selected} />
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map(({ value, label, icon: Icon, className }) => (
          <button
            key={value}
            type="button"
            data-selected={selected === value}
            onClick={() => handleSelect(value)}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-6 text-lg font-semibold transition-colors",
              className,
            )}
          >
            <Icon className="h-10 w-10" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
