import { notFound } from "next/navigation";
import { ArrowLeft, Users, Siren } from "lucide-react";
import Link from "next/link";
import { getConversation, listMessages, markConversationRead } from "@/lib/services/messages.service";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { MessageThread } from "@/components/messaging/message-thread";
import { MessageComposer } from "@/components/messaging/message-composer";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const conversation = await getConversation(id);

  if (!conversation) notFound();

  const messages = await listMessages(id);
  await markConversationRead(id);

  const otherParticipant = conversation.participants.find((p) => p.id !== profile?.id);
  const title =
    conversation.type === "group"
      ? conversation.title || "Groupe"
      : conversation.type === "incident"
        ? conversation.incidentTitle || conversation.title || "Incident"
        : otherParticipant?.fullName || "Conversation";

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <Link href="/messagerie" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
          {conversation.type === "group" ? (
            <Users className="h-4 w-4 text-muted-foreground" />
          ) : conversation.type === "incident" ? (
            <Siren className="h-4 w-4 text-destructive" />
          ) : null}
        </div>
        <div>
          <p className="font-medium">{title}</p>
          {conversation.type !== "direct" && (
            <p className="text-xs text-muted-foreground">
              {conversation.participants.length} participant{conversation.participants.length > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      <MessageThread initialMessages={messages} conversationId={id} currentUserId={profile?.id ?? ""} />

      <MessageComposer conversationId={id} />
    </div>
  );
}
