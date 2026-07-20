import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { getAppSettings } from "@/lib/services/settings.service";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ suspendu?: string; next?: string }>;
}) {
  const { suspendu, next } = await searchParams;
  const settings = await getAppSettings();

  return (
    <main className="register-grid flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-sm">
        <div className="hazard-stripe mb-6 flex h-14 items-center justify-center rounded-md">
          <div className="flex items-center gap-2 rounded bg-background px-4 py-1.5">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.appName} className="h-6 w-6 object-contain" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-primary" />
            )}
            <span className="font-display text-base font-bold tracking-tight">{settings.appName}</span>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>Accédez à votre espace {settings.appName}</CardDescription>
          </CardHeader>
          <CardContent>
            {suspendu && (
              <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Votre compte a été suspendu. Contactez un administrateur.
              </p>
            )}
            <LoginForm next={next} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
