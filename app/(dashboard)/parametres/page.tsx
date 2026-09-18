import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { getAppSettings } from "@/lib/services/settings.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppNameForm } from "@/components/settings/app-name-form";
import { LogoUpload } from "@/components/settings/logo-upload";

export default async function ParametresPage() {
  const profile = await getCurrentProfile();
  const permissions = await getCurrentPermissions();
  if (!profile || !permissions.has("settings.manage")) redirect("/dashboard");

  const settings = await getAppSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-muted-foreground">
          Personnalise l&apos;application pour ton entreprise — nom et logo s&apos;appliquent partout,
          y compris sur les pages de connexion.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
          <CardDescription>Nom et logo affichés dans toute l&apos;application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogoUpload currentLogoUrl={settings.logoUrl} />
          <AppNameForm currentName={settings.appName} />
        </CardContent>
      </Card>

      <Card className="hover:border-emerald-500/50 transition-colors">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Base de Connaissances QHSE</CardTitle>
              <CardDescription className="mt-1">
                Gérer les sources de connaissances (PDF, DOCX, Excel), ré-ingérer les documents et configurer le socle d&apos;ingestion.
              </CardDescription>
            </div>
            <a
              href="/parametres/knowledge"
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Accéder au Socle
            </a>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
