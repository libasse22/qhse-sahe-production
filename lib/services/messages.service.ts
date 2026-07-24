"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";
import type { Conversation, Message, MessageAttachment } from "@/lib/types/messaging";

const ATTACHMENT_BUCKET = "message-attachments";

export async function listMyConversations(): Promise<Conversation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: participantRows } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id);

  if (!participantRows || participantRows.length === 0) return [];

  const conversationIds = participantRows.map((p: any) => p.conversation_id);
  const lastReadMap = new Map(participantRows.map((p: any) => [p.conversation_id, p.last_read_at]));

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("*, incident:incidents(title)")
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });

  if (error || !conversations) return [];

  const result: Conversation[] = [];

  for (const conv of conversations as any[]) {
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user:profiles(id, full_name, avatar_url)")
      .eq("conversation_id", conv.id);

    const { data: lastMsg } = await supabase
      .from("messages")
      .select("content, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastReadAt = lastReadMap.get(conv.id);
    let unreadCount = 0;
    if (lastReadAt) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .gt("created_at", lastReadAt as string);
      unreadCount = count ?? 0;
    } else {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id);
      unreadCount = count ?? 0;
    }

    result.push({
      id: conv.id,
      type: conv.type,
      title: conv.title,
      incidentId: conv.incident_id,
      incidentTitle: conv.incident?.title ?? null,
      createdBy: conv.created_by,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      lastMessage: lastMsg?.content ?? null,
      lastMessageAt: lastMsg?.created_at ?? null,
      unreadCount,
      participants: (participants ?? []).map((p: any) => ({
        id: p.user.id,
        fullName: p.user.full_name,
        avatarUrl: p.user.avatar_url,
      })),
    });
  }

  return result;
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const conversations = await listMyConversations();
  return conversations.find((c) => c.id === conversationId) ?? null;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*, sender:profiles(full_name, avatar_url), attachments:message_attachments(*)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return Promise.all(
    (data as any[]).map(async (row) => {
      const attachments: MessageAttachment[] = await Promise.all(
        (row.attachments ?? []).map(async (a: any) => {
          const { data: signed } = await supabase.storage
            .from(ATTACHMENT_BUCKET)
            .createSignedUrl(a.storage_path, 3600);
          return {
            id: a.id,
            messageId: a.message_id,
            storagePath: a.storage_path,
            fileName: a.file_name,
            mimeType: a.mime_type,
            url: signed?.signedUrl ?? null,
          };
        }),
      );

      return {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        senderName: row.sender?.full_name ?? "-",
        senderAvatarUrl: row.sender?.avatar_url ?? null,
        content: row.content,
        createdAt: row.created_at,
        attachments,
      };
    }),
  );
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<ActionResult & { messageId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expiree, reconnecte-toi." };

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, content })
    .select("id")
    .single();

  if (error || !data) return { error: "Impossible d'envoyer le message." };

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() } as any)
    .eq("id", conversationId);

  revalidatePath("/messagerie");
  revalidatePath(`/messagerie/${conversationId}`);
  return { error: null, messageId: (data as any).id };
}

export async function createMessageAttachmentUploadTarget(
  messageId: string,
  fileName: string,
): Promise<{ path: string; token: string } | { error: string }> {
  const supabase = await createClient();
  const path = `${messageId}/${Date.now()}-${fileName}`;
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "Impossible de preparer l'envoi de la piece jointe." };
  return { path: data.path, token: data.token };
}

export async function confirmMessageAttachment(
  messageId: string,
  storagePath: string,
  fileName: string,
  mimeType: string,
  conversationId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("message_attachments").insert({
    message_id: messageId,
    storage_path: storagePath,
    file_name: fileName,
    mime_type: mimeType,
  } as any);
  if (error) return { error: "Piece jointe non enregistree." };
  revalidatePath(`/messagerie/${conversationId}`);
  return { error: null };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() } as any)
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
}

export async function createDirectConversation(
  otherUserId: string,
): Promise<{ conversationId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expiree, reconnecte-toi." };
  if (user.id === otherUserId) return { error: "Impossible de discuter avec soi-meme." };

  const { data: myConvs } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (myConvs && myConvs.length > 0) {
    const ids = (myConvs as any[]).map((c) => c.conversation_id);
    const { data: candidates } = await supabase
      .from("conversations")
      .select("id, type")
      .in("id", ids)
      .eq("type", "direct");

    if (candidates) {
      for (const c of candidates as any[]) {
        const { data: participants } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", c.id);
        const participantIds = (participants ?? []).map((p: any) => p.user_id);
        if (participantIds.length === 2 && participantIds.includes(otherUserId)) {
          return { conversationId: c.id };
        }
      }
    }
  }

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({ type: "direct", created_by: user.id } as any)
    .select("id")
    .single();

  if (error || !conv) return { error: "Impossible de creer la conversation: " + (error?.message ?? "inconnue") };

  await supabase.from("conversation_participants").insert([
    { conversation_id: (conv as any).id, user_id: user.id },
    { conversation_id: (conv as any).id, user_id: otherUserId },
  ] as any);

  return { conversationId: (conv as any).id };
}

export async function createGroupConversation(
  title: string,
  participantIds: string[],
): Promise<{ conversationId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expiree, reconnecte-toi." };

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({ type: "group", title, created_by: user.id } as any)
    .select("id")
    .single();

  if (error || !conv) return { error: "Impossible de creer le groupe." };

  const uniqueIds = Array.from(new Set([...participantIds, user.id]));
  await supabase
    .from("conversation_participants")
    .insert(uniqueIds.map((id) => ({ conversation_id: (conv as any).id, user_id: id })) as any);

  revalidatePath("/messagerie");
  return { conversationId: (conv as any).id };
}

export async function getOrCreateIncidentConversation(
  incidentId: string,
): Promise<{ conversationId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expiree, reconnecte-toi." };

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("incident_id", incidentId)
    .eq("type", "incident")
    .maybeSingle();

  if (existing) {
    const { data: alreadyIn } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", (existing as any).id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!alreadyIn) {
      await supabase
        .from("conversation_participants")
        .insert({ conversation_id: (existing as any).id, user_id: user.id } as any);
    }

    return { conversationId: (existing as any).id };
  }

  const { data: incident } = await supabase
    .from("incidents")
    .select("title, reported_by, assigned_to")
    .eq("id", incidentId)
    .single();

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({
      type: "incident",
      incident_id: incidentId,
      title: (incident as any)?.title ?? "Incident",
      created_by: user.id,
    } as any)
    .select("id")
    .single();

  if (error || !conv) return { error: "Impossible de creer la discussion." };

  const participantIds = new Set<string>([user.id]);
  if ((incident as any)?.reported_by) participantIds.add((incident as any).reported_by);
  if ((incident as any)?.assigned_to) participantIds.add((incident as any).assigned_to);

  await supabase
    .from("conversation_participants")
    .insert(Array.from(participantIds).map((id) => ({ conversation_id: (conv as any).id, user_id: id })) as any);

  revalidatePath(`/incidents/${incidentId}`);
  return { conversationId: (conv as any).id };
}

