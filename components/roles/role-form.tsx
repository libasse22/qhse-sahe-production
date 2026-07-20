"use client";

import { useState, useTransition } from "react";
import { createRole } from "@/lib/services/roles.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BASE_BUCKET_LABELS } from "@/lib/types/role";
import type { Permission } from "@/lib/types/role";

function groupByCategory(permissions: Permission[]) {
  const groups = new Map<string, Permission[]>();
  for (const p of permissions) {
    if (!groups.has(p.category)) groups.set(p.category, []);
    groups.get(p.category)!.push(p);
  }
  return groups;
}

export function RoleForm({ permissions }: { permissions: Permission[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const grouped = groupByCategory(permissions);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createRole(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Créer un rôle personnalisé</Button>;
  }

  return (
    <form action={handleSubmit} className="space-y-5 rounded-lg border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nom du rôle</Label>
          <Input id="name" name="name" required maxLength={60} placeholder="Ex : Auditeur externe" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="baseBucket">Espace applicatif</Label>
          <Select id="baseBucket" name="baseBucket" required defaultValue="manager_qhse">
            <option value="manager_qhse">{BASE_BUCKET_LABELS.manager_qhse}</option>
            <option value="admin">{BASE_BUCKET_LABELS.admin}</option>
            <option value="employe">{BASE_BUCKET_LABELS.employe}</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>

      <div className="space-y-3">
        <Label>Permissions</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from(grouped.entries()).map(([category, perms]) => (
            <div key={category} className="rounded-md border border-border p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{category}</p>
              <div className="space-y-1.5">
                {perms.map((p) => (
                  <label key={p.id} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" name="permissionCodes" value={p.code} className="mt-1" />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Création…" : "Créer le rôle"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
