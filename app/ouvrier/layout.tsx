import { redirect } from "next/navigation";
import { LogOut, Plus, ListChecks, ShieldCheck, MessageSquare } from "lucide-react";
import { getCurrentProfile, signOut } from "@/lib/services/auth.service";
import { getAppSettings } from "@/lib/services/settings.service";
import { OfflineIndicator } from "@/components/ouvrier/offline-indicator";
import { NotificationBell } from "@/components/notifications/notification-bell";

export default async function OuvrierLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/en-attente");
  if (profile.role !== "employe") redirect("/dashboard");

  const settings = await getAppSettings();

  return (
    <div className="flex min-h-screen flex-col bg-secondary/20">
      <div className="hazard-stripe h-1.5 w-full" aria-hidden="true" />
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <div className="flex items-center gap-2">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt={settings.appName} className="h-8 w-8 object-contain" />
          ) : (
            <ShieldCheck className="h-7 w-7 text-primary" />
          )}
          <div>
            <p className="font-display text-lg font-bold leading-tight tracking-tight">{settings.appName}</p>
            <p className="text-sm text-muted-foreground">{profile.fullName || profile.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell userId={profile.id} />
          <form action={signOut}>
            <button type="submit" aria-label="DÃ©connexion" className="rounded-full p-2 hover:bg-accent">
              <LogOut className="h-6 w-6 text-muted-foreground" />
            </button>
          </form>
        </div>
      </header>

      <OfflineIndicator />

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>

      <nav className="sticky bottom-0 flex border-t border-border bg-card">
        <a href="/ouvrier/declarer" className="flex flex-1 flex-col items-center gap-1 py-3 text-primary">
          <Plus className="h-7 w-7" />
          <span className="text-sm font-medium">DÃ©clarer</span>
        </a>
        <a href="/ouvrier/mes-declarations" className="flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground">
          <ListChecks className="h-7 w-7" />
          <span className="text-sm font-medium">Mes signalements</span>
        </a>
        <a href="/ouvrier/politique" className="flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground">
          <ShieldCheck className="h-7 w-7" />
          <span className="text-sm font-medium">Politique</span>
        </a>
        <a href="/messagerie" className="flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground">
          <MessageSquare className="h-7 w-7" />
          <span className="text-sm font-medium">Messages</span>
        </a>
      </nav>
    </div>
  );
}

