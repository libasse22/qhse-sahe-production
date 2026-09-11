"use client";

import { useState, useEffect, useTransition } from "react";
import { addActionComment, listActionComments } from "@/lib/services/actions.service";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionComment } from "@/lib/types/actions";

export function ActionCommentsJournal({ actionId }: { actionId: string }) {
  const [comments, setComments] = useState<ActionComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listActionComments(actionId).then(setComments);
  }, [actionId]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setError(null);

    startTransition(async () => {
      const res = await addActionComment(actionId, newComment);
      if (res.error) {
        setError(res.error);
      } else {
        setNewComment("");
        const updated = await listActionComments(actionId);
        setComments(updated);
      }
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <h4 className="font-semibold text-foreground text-sm flex items-center justify-between">
        <span>💬 Journal d&apos;avancement opérationnel</span>
        <span className="text-xs text-muted-foreground font-normal">{comments.length} commentaire(s)</span>
      </h4>

      <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            Aucun commentaire d&apos;avancement saisi pour l&apos;instant.
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-muted/40 p-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-semibold text-foreground">{c.authorName}</span>
                <span>{new Date(c.createdAt).toLocaleString("fr-FR")}</span>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{c.comment}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="space-y-2 pt-2 border-t border-border">
        <Textarea
          rows={2}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Ajouter une note d'avancement (ex: matériel commandé, intervention en cours)..."
          className="text-xs"
        />
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" size="sm" variant="secondary" disabled={isPending || !newComment.trim()}>
            {isPending ? "Envoi..." : "Publier la note"}
          </Button>
        </div>
      </form>
    </div>
  );
}
