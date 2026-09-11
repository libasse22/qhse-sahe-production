import type { DocumentStatus } from "@/lib/types/document";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className: string }
> = {
  en_vigueur: {
    label: "EN VIGUEUR",
    variant: "default",
    className: "bg-emerald-600/90 text-white hover:bg-emerald-600 dark:bg-emerald-700/90",
  },
  brouillon: {
    label: "BROUILLON",
    variant: "secondary",
    className: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  en_revue: {
    label: "EN REVUE",
    variant: "outline",
    className: "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
  },
  en_attente_signature: {
    label: "ATTENTE SIGNATURE",
    variant: "outline",
    className: "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400",
  },
  approuve: {
    label: "APPROUVÉ",
    variant: "default",
    className: "bg-teal-600 text-white hover:bg-teal-700",
  },
  rejete: {
    label: "REJETÉ",
    variant: "destructive",
    className: "bg-red-600 text-white",
  },
  obsolete: {
    label: "OBSOLÈTE",
    variant: "secondary",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 line-through opacity-80",
  },
  archive: {
    label: "ARCHIVÉ",
    variant: "outline",
    className: "border-gray-400 text-gray-500 bg-gray-50 dark:bg-gray-900/40 dark:text-gray-400",
  },
};

export function DocumentStatusBadge({ status }: { status?: DocumentStatus }) {
  const config = (status && STATUS_CONFIG[status]) || {
    label: (status || "EN VIGUEUR").toUpperCase(),
    variant: "default" as const,
    className: "bg-slate-600 text-white",
  };

  return (
    <Badge variant={config.variant} className={`text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 ${config.className}`}>
      {config.label}
    </Badge>
  );
}
