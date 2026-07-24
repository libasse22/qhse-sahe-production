import { listActiveUsers } from "@/lib/services/users.service";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { NewConversationForm } from "@/components/messaging/new-conversation-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewConversationPage() {
  const profile = await getCurrentProfile();
  const users = await listActiveUsers();
  const otherUsers = users.filter((u) => u.id !== profile?.id);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nouvelle discussion</h1>
        <p className="text-muted-foreground">Demarre une conversation privee ou de groupe.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Destinataires</CardTitle>
          <CardDescription>Choisis une personne pour une discussion privee, ou plusieurs pour un groupe.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewConversationForm users={otherUsers} />
        </CardContent>
      </Card>
    </div>
  );
}
