import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { listAllUsers } from "@/lib/services/users.service";
import { listRoles } from "@/lib/services/roles.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserRow } from "@/components/admin/user-row";

export default async function UtilisateursPage() {
  const profile = await getCurrentProfile();
  const permissions = await getCurrentPermissions();
  if (!profile || !permissions.has("users.manage")) redirect("/dashboard");

  const [users, roles] = await Promise.all([listAllUsers(), listRoles()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">
            {users.length} compte(s). Attribue un rôle ou suspends un accès à tout moment.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/roles">
            <ShieldCheck className="h-4 w-4" />
            Gérer les rôles & permissions
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tous les comptes</CardTitle>
          <CardDescription>
            Les comptes en attente doivent d&apos;abord être validés depuis « Comptes en attente ».
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="pb-2 font-medium">Utilisateur</th>
                <th className="pb-2 font-medium">Statut</th>
                <th className="pb-2 font-medium">Rôle</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} profile={user} isSelf={user.id === profile.id} roles={roles} />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
