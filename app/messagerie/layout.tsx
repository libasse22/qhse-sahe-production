import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getAppSettings } from "@/lib/services/settings.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserNav } from "@/components/layout/user-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";

export default async function MessagerieLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/en-attente");

  if (profile.role === "employe") {
    return <div className="mx-auto min-h-screen w-full max-w-md px-4 py-6">{children}</div>;
  }

  const [settings, permissions] = await Promise.all([getAppSettings(), getCurrentPermissions()]);

  return (
    <div className="flex min-h-screen">
      <SidebarNav permissions={Array.from(permissions)} appName={settings.appName} logoUrl={settings.logoUrl} />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end gap-2 border-b border-border bg-card px-6">
          <NotificationBell userId={profile.id} />
          <UserNav profile={profile} />
        </header>
        <main className="register-grid flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
