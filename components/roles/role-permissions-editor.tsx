"use client";

import { useState, useTransition } from "react";
import { updateRolePermissions } from "@/lib/services/roles.service";
import { Button } from "@/components/ui/button";
import type { Permission, Role } from "@/lib/types/role";

export function RolePermissionsEditor({ role, permissions }: { role: Role; permissions: Permission[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissionCodes));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle(code: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateRolePermissions(role.id, Array.from(selected));
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  const grouped = new Map<string, Permission[]>();
  for (const p of permissions) {
    if (!grouped.has(p.category)) grouped.set(p.category, []);
    grouped.get(p.category)!.push(p);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from(grouped.entries()).map(([category, perms]) => (
          <div key={category} className="rounded-md border border-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{category}</p>
            <div className="space-y-1.5">
              {perms.map((p) => (
                <label key={p.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(p.code)}
                    onChange={() => toggle(p.code)}
                    disabled={isPending}
                    className="mt-1"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer les permissions"}
        </Button>
        {saved && !error && <span className="text-xs text-emerald-700">Enregistré.</span>}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </div>
  );
}
