import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
import { listMyConversations } from "@/lib/services/messages.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConversationList } from "@/components/messaging/conversation-list";

export default async function MessagerieePage() {
  const conversations = await listMyConversations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Messagerie</h1>
          <p className="text-muted-foreground">Discussions internes et suivi des incidents.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/messagerie/nouveau">
            <MessageSquarePlus className="h-4 w-4" />
            Nouvelle discussion
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>Tes echanges privés, de groupe et lies aux incidents.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConversationList conversations={conversations} />
        </CardContent>
      </Card>
    </div>
  );
}
