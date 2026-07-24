export type ConversationType = "direct" | "group" | "incident";

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  incidentId: string | null;
  incidentTitle: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  participants: { id: string; fullName: string; avatarUrl: string | null }[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  content: string | null;
  createdAt: string;
  attachments: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  url: string | null;
}
