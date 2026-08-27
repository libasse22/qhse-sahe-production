"use client";

import Link from "next/link";
import { 
  AlertTriangle, 
  ArrowRight, 
  Calendar, 
  Clock, 
  FileText, 
  MapPin, 
  ShieldAlert, 
  Siren, 
  User, 
  Wrench 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CockpitItem } from "@/lib/services/cockpit.service";

interface CockpitItemCardProps {
  item: CockpitItem;
}

const CATEGORY_ICONS = {
  incident: Siren,
  action: Clock,
  audit: Calendar,
  risk: ShieldAlert,
  equipment: Wrench,
  document: FileText,
};

export function CockpitItemCard({ item }: CockpitItemCardProps) {
  const IconComponent = CATEGORY_ICONS[item.category] || AlertTriangle;

  const borderClass =
    item.priority === "urgent"
      ? "border-l-4 border-l-red-500 bg-red-500/5 hover:bg-red-500/10 dark:bg-red-950/20"
      : item.priority === "a_traiter"
      ? "border-l-4 border-l-amber-500 bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-950/20"
      : "border-l-4 border-l-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-950/20";

  return (
    <Link
      href={item.href}
      className={`group flex flex-col justify-between rounded-lg border border-border p-4 transition-all duration-200 hover:shadow-md ${borderClass}`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-background p-1.5 shadow-sm text-foreground">
              <IconComponent className="h-4 w-4" />
            </span>
            <Badge variant={item.badgeVariant} className="text-xs font-semibold">
              {item.badgeText}
            </Badge>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
        </div>

        <div>
          <h4 className="font-semibold text-base leading-tight group-hover:underline">
            {item.title}
          </h4>
          {item.subtitle && (
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {item.subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2 text-xs text-muted-foreground">
        {item.assignedTo ? (
          <span className="flex items-center gap-1 font-medium text-foreground/80">
            <User className="h-3 w-3" />
            {item.assignedTo}
          </span>
        ) : (
          <span>Non assigné</span>
        )}

        <span className={`flex items-center gap-1 font-mono text-[11px] ${item.isOverdue ? "font-bold text-red-600 dark:text-red-400" : ""}`}>
          <Calendar className="h-3 w-3" />
          {item.dateLabel}
        </span>
      </div>
    </Link>
  );
}
