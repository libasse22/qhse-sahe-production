import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getAppSettings } from "@/lib/services/settings.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserNav } from "@/components/layout/user-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PwaHeaderStatus } from "@/components/pwa-register";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // Filet de sécurité : le middleware gère déjà les redirections, mais on
  // s'assure qu'aucune donnée protégée ne peut être rendue sans profil.
  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/en-attente");
  if (profile.role === "employe") redirect("/ouvrier/declarer");

  const [settings, permissions] = await Promise.all([getAppSettings(), getCurrentPermissions()]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SidebarNav permissions={Array.from(permissions)} appName={settings.appName} logoUrl={settings.logoUrl} />
      <MobileNav permissions={Array.from(permissions)} appName={settings.appName} logoUrl={settings.logoUrl} userId={profile.id} />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-end gap-3 border-b border-border/80 glass-header px-6 md:flex transition-all duration-200">
          <PwaHeaderStatus />
          <NotificationBell userId={profile.id} />
          <UserNav profile={profile} />
        </header>
        <main className="register-grid flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}


