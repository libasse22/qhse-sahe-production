"use client";

import Link from "next/link";
import { MessageSquare, Users, Siren } from "lucide-react";
import type { Conversation } from "@/lib/types/messaging";

function formatWhen(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function conversationLabel(conv: Conversation, currentUserId?: string): string {
  if (conv.type === "group") return conv.title || "Groupe";
  if (conv.type === "incident") return conv.incidentTitle || conv.title || "Incident";
  const other = conv.participants.find((p) => p.id !== currentUserId);
  return other?.fullName || conv.title || "Conversation";
}

export function ConversationList({ conversations }: { conversations: Conversation[] }) {
  if (conversations.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune conversation pour le moment.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {conversations.map((conv) => (
        <li key={conv.id}>
          <Link
            href={`/messagerie/${conv.id}`}
            className="flex items-center gap-3 py-3 hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              {conv.type === "group" ? (
                <Users className="h-5 w-5 text-muted-foreground" />
              ) : conv.type === "incident" ? (
                <Siren className="h-5 w-5 text-destructive" />
              ) : (
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{conversationLabel(conv)}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(conv.lastMessageAt)}</span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {conv.lastMessage || "Aucun message"}
              </p>
            </div>
            {conv.unreadCount > 0 && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {conv.unreadCount}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
