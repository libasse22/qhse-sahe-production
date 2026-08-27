"use client";

import { AlertOctagon, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CockpitItemCard } from "@/components/dashboard/cockpit-item-card";
import type { CockpitItem, CockpitItemPriority } from "@/lib/services/cockpit.service";

interface CockpitSectionProps {
  priority: CockpitItemPriority;
  title: string;
  description: string;
  items: CockpitItem[];
}

const PRIORITY_CONFIG = {
  urgent: {
    icon: AlertOctagon,
    badgeVariant: "destructive" as const,
    bgClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    emptyMessage: "🟢 Aucune urgence immédiate. Tous les incidents majeurs et actions sont sous contrôle.",
  },
  a_traiter: {
    icon: Clock,
    badgeVariant: "warning" as const,
    bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    emptyMessage: "Toutes les échéances de la semaine sont à jour.",
  },
  info: {
    icon: CheckCircle2,
    badgeVariant: "secondary" as const,
    bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    emptyMessage: "Aucun fil d'information récent.",
  },
};

export function CockpitSection({ priority, title, description, items }: CockpitSectionProps) {
  const config = PRIORITY_CONFIG[priority];
  const IconComponent = config.icon;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-lg p-2 border ${config.bgClass}`}>
            <IconComponent className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
              {title}
              <Badge variant={config.badgeVariant} className="rounded-full px-2.5 py-0.5 text-xs font-bold">
                {items.length}
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground bg-muted/30">
          <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>{config.emptyMessage}</span>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <CockpitItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
