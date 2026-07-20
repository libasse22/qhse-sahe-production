import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { listPendingUsers } from "@/lib/services/users.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PendingUserRow } from "@/components/admin/pending-user-row";

export default async function UtilisateursEnAttentePage() {
  const profile = await getCurrentProfile();
  const permissions = await getCurrentPermissions();
  if (!profile || !permissions.has("users.manage")) redirect("/dashboard");

  const pendingUsers = await listPendingUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Comptes en attente</h1>
        <p className="text-muted-foreground">
          Attribuez un rôle et validez les nouvelles inscriptions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{pendingUsers.length} compte(s) en attente</CardTitle>
          <CardDescription>
            Un compte rejeté ne pourra plus se connecter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun compte en attente pour le moment.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="pb-2 font-medium">Utilisateur</th>
                  <th className="pb-2 font-medium">Rôle à attribuer</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user) => (
                  <PendingUserRow key={user.id} profile={user} />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
