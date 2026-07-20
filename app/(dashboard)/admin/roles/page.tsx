import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getCurrentPermissions, listPermissions, listRoles } from "@/lib/services/roles.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleForm } from "@/components/roles/role-form";
import { RolePermissionsEditor } from "@/components/roles/role-permissions-editor";
import { DeleteRoleButton } from "@/components/roles/delete-role-button";
import { BASE_BUCKET_LABELS } from "@/lib/types/role";

export default async function RolesPage() {
  const profile = await getCurrentProfile();
  const currentPermissions = await getCurrentPermissions();
  if (!profile || !currentPermissions.has("roles.manage")) redirect("/dashboard");

  const [roles, permissions] = await Promise.all([listRoles(), listPermissions()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Rôles & permissions</h1>
        <p className="text-muted-foreground">
          Les 3 rôles système couvrent les besoins courants. Crée un rôle personnalisé pour un besoin
          plus précis (ex : un auditeur externe qui ne doit pas gérer les utilisateurs).
        </p>
      </div>

      <RoleForm permissions={permissions} />

      <div className="space-y-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {role.name}
                    {role.isSystem && <Badge variant="secondary">Rôle système</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {role.description || "Aucune description"} — {BASE_BUCKET_LABELS[role.baseBucket]}
                  </CardDescription>
                </div>
                {!role.isSystem && <DeleteRoleButton roleId={role.id} />}
              </div>
            </CardHeader>
            <CardContent>
              {role.isSystem ? (
                <p className="text-sm text-muted-foreground">
                  {role.permissionCodes.length === 0
                    ? "Aucune permission de gestion (espace Terrain)."
                    : `${role.permissionCodes.length} permission(s) — fixes, non modifiables pour un rôle système.`}
                </p>
              ) : (
                <RolePermissionsEditor role={role} permissions={permissions} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
