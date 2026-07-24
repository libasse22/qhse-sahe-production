"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendMessage } from "@/lib/services/messages.service";
import { Button } from "@/components/ui/button";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isPending) return;

    setError(null);
    setContent("");

    startTransition(async () => {
      const result = await sendMessage(conversationId, trimmed);
      if (result.error) {
        setError(result.error);
        setContent(trimmed);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border pt-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as unknown as React.FormEvent);
          }
        }}
        placeholder="Ecris un message..."
        rows={1}
        className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <Button type="submit" size="sm" disabled={isPending || !content.trim()}>
        <Send className="h-4 w-4" />
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
