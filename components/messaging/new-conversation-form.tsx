"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDirectConversation, createGroupConversation } from "@/lib/services/messages.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/lib/types/auth";

export function NewConversationForm({ users }: { users: Profile[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleUser(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleStart() {
    setError(null);
    if (selectedIds.length === 0) {
      setError("Choisis au moins une personne.");
      return;
    }

    startTransition(async () => {
      if (selectedIds.length === 1) {
        const result = await createDirectConversation(selectedIds[0]);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        router.push(`/messagerie/${result.conversationId}`);
      } else {
        if (!groupTitle.trim()) {
          setError("Donne un nom au groupe.");
          return;
        }
        const result = await createGroupConversation(groupTitle.trim(), selectedIds);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        router.push(`/messagerie/${result.conversationId}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-2">
        {users.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">Aucun autre utilisateur actif.</p>
        ) : (
          users.map((u) => (
            <label
              key={u.id}
              className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(u.id)}
                onChange={() => toggleUser(u.id)}
                className="h-4 w-4"
              />
              <div>
                <p className="text-sm font-medium">{u.fullName || u.email}</p>
                {u.poste && <p className="text-xs text-muted-foreground">{u.poste}</p>}
              </div>
            </label>
          ))
        )}
      </div>

      {selectedIds.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="groupTitle">Nom du groupe</Label>
          <Input
            id="groupTitle"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            placeholder="ex: Equipe chantier B"
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleStart} disabled={isPending} className="w-full">
        {isPending ? "Creation..." : "Demarrer la discussion"}
      </Button>
    </div>
  );
}
