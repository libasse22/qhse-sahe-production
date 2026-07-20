"use client";

import { useState, useTransition } from "react";
import { approveUser, rejectUser } from "@/lib/services/users.service";
import { Button } from "@/components/ui/button";
import type { Profile, UserRole } from "@/lib/types/auth";
import { ROLE_LABELS } from "@/lib/types/auth";

const ASSIGNABLE_ROLES: UserRole[] = ["employe", "manager_qhse", "admin"];

export function PendingUserRow({ profile }: { profile: Profile }) {
  const [role, setRole] = useState<UserRole>("employe");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveUser(profile.id, role);
      if (result.error) setError(result.error);
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectUser(profile.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4">
        <p className="font-medium">{profile.fullName || "—"}</p>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
      </td>
      <td className="py-3 pr-4">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          disabled={isPending}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleApprove} disabled={isPending}>
            Valider
          </Button>
          <Button size="sm" variant="outline" onClick={handleReject} disabled={isPending}>
            Rejeter
          </Button>
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </td>
    </tr>
  );
}
