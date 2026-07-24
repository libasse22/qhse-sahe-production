"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types/messaging";

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function MessageThread({
  initialMessages,
  conversationId,
  currentUserId,
}: {
  initialMessages: Message[];
  conversationId: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const newRow = payload.new as any;
          if (newRow.sender_id === currentUserId) return;

          const { data: sender } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", newRow.sender_id)
            .single();

          setMessages((prev) => [
            ...prev,
            {
              id: newRow.id,
              conversationId: newRow.conversation_id,
              senderId: newRow.sender_id,
              senderName: (sender as any)?.full_name ?? "-",
              senderAvatarUrl: (sender as any)?.avatar_url ?? null,
              content: newRow.content,
              createdAt: newRow.created_at,
              attachments: [],
            },
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 space-y-3 overflow-y-auto py-4">
      {messages.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Aucun message. Commence la discussion !</p>
      ) : (
        messages.map((msg) => {
          const isMine = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {!isMine && <p className="mb-0.5 text-xs font-medium opacity-70">{msg.senderName}</p>}
                {msg.content && <p className="whitespace-pre-wrap text-sm">{msg.content}</p>}
                {msg.attachments.map((att) => (
                  <div key={att.id} className="mt-2">
                    {att.mimeType?.startsWith("image/") && att.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={att.url} alt={att.fileName} className="max-h-48 rounded-md" />
                    ) : (
                      <a href={att.url ?? "#"} target="_blank" rel="noreferrer" className="text-xs underline">
                        {att.fileName}
                      </a>
                    )}
                  </div>
                ))}
                <p className={`mt-1 text-right text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
