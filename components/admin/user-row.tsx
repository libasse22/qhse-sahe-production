"use client";

import { useState, useTransition } from "react";
import { assignUserRole, setUserStatus } from "@/lib/services/users.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import  { STATUS_LABELS, type Profile, type UserStatus } from "@/lib/types/auth";
import type { Role } from "@/lib/types/role";

const STATUS_BADGE_VARIANT: Record<UserStatus, "outline" | "success" | "destructive"> = {
  pending: "outline",
  active: "success",
  suspended: "destructive",
};

export function UserRow({
  profile,
  isSelf,
  roles,
}: {
  profile: Profile;
  isSelf: boolean;
  roles: Role[];
}) {
  const [roleId, setRoleId] = useState<string>(profile.roleId ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRoleChange(newRoleId: string) {
    setRoleId(newRoleId);
    setError(null);
    startTransition(async () => {
      const result = await assignUserRole(profile.id, newRoleId);
      if (result.error) setError(result.error);
    });
  }

  function handleToggleStatus() {
    setError(null);
    const nextStatus = profile.status === "suspended" ? "active" : "suspended";
    startTransition(async () => {
      const result = await setUserStatus(profile.id, nextStatus);
      if (result.error) setError(result.error);
    });
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4">
        <p className="font-medium">
          {profile.fullName || "—"} {isSelf && <span className="text-xs text-muted-foreground">(vous)</span>}
        </p>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
      </td>
      <td className="py-3 pr-4">
        <Badge variant={STATUS_BADGE_VARIANT[profile.status]}>{STATUS_LABELS[profile.status]}</Badge>
      </td>
      <td className="py-3 pr-4">
        <Select
          value={roleId}
          onChange={(e) => handleRoleChange(e.target.value)}
          disabled={isPending || isSelf || profile.status === "pending"}
          className="h-9 w-52 text-sm"
        >
          <option value="" disabled>
            Sélectionner un rôle…
          </option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </td>
      <td className="py-3 pr-4">
        {profile.status !== "pending" && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleStatus}
            disabled={isPending || isSelf}
          >
            {profile.status === "suspended" ? "Réactiver" : "Suspendre"}
          </Button>
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </td>
    </tr>
  );
}
