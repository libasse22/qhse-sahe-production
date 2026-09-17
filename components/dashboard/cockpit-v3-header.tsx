"use client";

import { ShieldCheck, Activity, Building2 } from "lucide-react";

interface CockpitV3HeaderProps {
  userName?: string | null;
  companyName?: string | null;
  urgentCount: number;
  aTraiterCount: number;
}

export function CockpitV3Header({
  userName,
  companyName = "QHSE Duo Sénégal",
  urgentCount,
  aTraiterCount,
}: CockpitV3HeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Centre de Conformité Opérationnel
          </h1>
          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary border border-primary/20">
            Cockpit V3
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {userName ? `Bienvenue, ${userName}` : "Bienvenue"}. Pilotage transversal, arbitrages urgents et traçabilité 360°.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-accent/40 px-3 py-1.5 rounded-lg border border-border">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span>{companyName}</span>
        </div>

        {urgentCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 border border-rose-500/30 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            {urgentCount} Urgence{urgentCount > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            0 Urgence critique
          </span>
        )}

        {aTraiterCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 border border-amber-500/20">
            <Activity className="h-3.5 w-3.5" />
            {aTraiterCount} À traiter
          </span>
        )}
      </div>
    </div>
  );
}
