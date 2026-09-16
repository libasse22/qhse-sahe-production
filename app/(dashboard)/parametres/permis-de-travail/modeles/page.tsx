import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import {
  listWorkPermitTemplates,
  archiveWorkPermitTemplate,
  setDefaultTemplate,
} from "@/lib/services/permit-templates.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileCheck2,
  Plus,
  Star,
  Archive,
  Edit,
  Eye,
  Layers,
  Sparkles,
} from "lucide-react";

export default async function WorkPermitTemplatesPage() {
  const profile = await getCurrentProfile();
  const permissions = await getCurrentPermissions();

  if (!profile) redirect("/login");

  // Check view permissions
  if (!permissions.has("permits.templates.view") && !permissions.has("permits.view") && profile.role !== "admin" && profile.role !== "manager_qhse") {
    redirect("/dashboard");
  }

  const templates = await listWorkPermitTemplates();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              PERMIS DE TRAVAIL
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              Référentiels & Modèles
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les référentiels de permis de travail spécifiques à votre entreprise. Les permis créés sont liés de façon immuable à leur version.
          </p>
        </div>

        <Link href="/parametres/permis-de-travail/modeles/nouveau">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Créer un Référentiel
          </Button>
        </Link>
      </div>

      {/* Standard Reference Card */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-base">
                  QHSE Duo — Référentiel Standard
                </h3>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  Actif par Défaut (National)
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Référentiel réglementaire de base incluant 10 questionnaires types, mesures AVANT/PENDANT/APRÈS et EPI standards.
              </p>
            </div>
          </div>
          <Link href="/parametres/permis-de-travail/modeles/default">
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <Eye className="h-3.5 w-3.5" /> Consulter Référentiel
            </Button>
          </Link>
        </div>
      </div>

      {/* Company Templates List */}
      <div className="space-y-4 pt-2">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" /> Modèles Personnalisés de l&apos;Entreprise ({templates.length})
        </h2>

        {templates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
            <FileCheck2 className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Aucun modèle personnalisé créé</p>
              <p className="text-xs text-muted-foreground">
                Votre entreprise utilise actuellement le référentiel standard QHSE Duo. Vous pouvez créer votre propre référentiel.
              </p>
            </div>
            <Link href="/parametres/permis-de-travail/modeles/nouveau">
              <Button size="sm" variant="outline" className="gap-1.5 mt-2">
                <Plus className="h-4 w-4" /> Créer le premier modèle
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => {
              const activeVer = template.activeVersion;
              const enabledCount = activeVer?.configuration?.enabledPermitTypes?.length ?? 10;

              return (
                <div
                  key={template.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-primary/50 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {template.code}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        {template.isDefault && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] py-0">
                            Par défaut
                          </Badge>
                        )}
                        <Badge
                          variant={
                            template.status === "actif"
                              ? "success"
                              : template.status === "brouillon"
                              ? "warning"
                              : "secondary"
                          }
                          className="text-[10px] py-0 capitalize"
                        >
                          {template.status}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="font-semibold text-foreground text-base leading-tight">
                      {template.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.description || "Aucune description."}
                    </p>
                  </div>

                  <div className="space-y-3 border-t border-border pt-3 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Version publiée :</span>
                      <span className="font-semibold text-foreground">
                        {activeVer ? activeVer.versionLabel : `v${template.versionMajor}.${template.versionMinor}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Types de travaux :</span>
                      <span className="font-semibold text-foreground">{enabledCount} catégories</span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Validité max :</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {activeVer?.configuration?.maxValidityHours || 8} heures
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Link href={`/parametres/permis-de-travail/modeles/${template.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                          <Edit className="h-3.5 w-3.5" /> Éditer
                        </Button>
                      </Link>

                      {!template.isDefault && template.status === "actif" && (
                        <form
                          action={async () => {
                            "use server";
                            await setDefaultTemplate(template.id);
                          }}
                        >
                          <Button variant="ghost" size="sm" type="submit" title="Définir par défaut" className="h-8 w-8 p-0 text-amber-500">
                            <Star className="h-4 w-4" />
                          </Button>
                        </form>
                      )}

                      {template.status !== "archive" && (
                        <form
                          action={async () => {
                            "use server";
                            await archiveWorkPermitTemplate(template.id);
                          }}
                        >
                          <Button variant="ghost" size="sm" type="submit" title="Archiver" className="h-8 w-8 p-0 text-destructive">
                            <Archive className="h-4 w-4" />
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
