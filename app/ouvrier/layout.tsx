import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Plus, ListChecks, ShieldCheck, MessageSquare, FileText } from "lucide-react";
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
            <button type="submit" aria-label="Deconnexion" className="rounded-full p-2 hover:bg-accent">
              <LogOut className="h-6 w-6 text-muted-foreground" />
            </button>
          </form>
        </div>
      </header>
      <OfflineIndicator />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>
      <nav className="sticky bottom-0 grid grid-cols-5 border-t border-border bg-card">
        <Link href="/ouvrier/declarer" className="flex flex-col items-center gap-1 py-3 text-primary">
          <Plus className="h-6 w-6" />
          <span className="text-[11px] font-medium">Declarer</span>
        </Link>
        <Link href="/ouvrier/mes-declarations" className="flex flex-col items-center gap-1 py-3 text-muted-foreground">
          <ListChecks className="h-6 w-6" />
          <span className="text-[11px] font-medium">Signalements</span>
        </Link>
        <Link href="/ouvrier/politique" className="flex flex-col items-center gap-1 py-3 text-muted-foreground">
          <ShieldCheck className="h-6 w-6" />
          <span className="text-[11px] font-medium">Politique</span>
        </Link>
        <Link href="/ouvrier/reglement-interieur" className="flex flex-col items-center gap-1 py-3 text-muted-foreground">
          <FileText className="h-6 w-6" />
          <span className="text-[11px] font-medium">Reglement</span>
        </Link>
        <Link href="/messagerie" className="flex flex-col items-center gap-1 py-3 text-muted-foreground">
          <MessageSquare className="h-6 w-6" />
          <span className="text-[11px] font-medium">Messages</span>
        </Link>
      </nav>
    </div>
  );
}
