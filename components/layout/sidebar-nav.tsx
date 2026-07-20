"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  UserCheck,
  Siren,
  ClipboardList,
  Users,
  FileText,
  ClipboardCheck,
  AlertOctagon,
  Target,
  Handshake,
  Presentation,
  FolderOpen,
  Settings,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Code de permission requis pour voir ce lien. Absent = visible par tous les rôles de l'espace QHSE. */
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/incidents", label: "Incidents", icon: Siren },
  { href: "/actions", label: "Actions correctives", icon: ClipboardList },
  { href: "/politique", label: "Politique QHSE", icon: FileText },
  { href: "/audits", label: "Audits internes", icon: ClipboardCheck },
  { href: "/risques", label: "Registre des risques", icon: AlertOctagon },
  { href: "/objectifs", label: "Objectifs & indicateurs", icon: Target },
  { href: "/parties-interessees", label: "Parties intéressées", icon: Handshake },
  { href: "/revues-de-direction", label: "Revues de direction", icon: Presentation },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/equipements", label: "Équipements", icon: Wrench },
  {
    href: "/admin/utilisateurs-en-attente",
    label: "Comptes en attente",
    icon: UserCheck,
    permission: "users.manage",
  },
  {
    href: "/admin/utilisateurs",
    label: "Gestion des utilisateurs",
    icon: Users,
    permission: "users.manage",
  },
  {
    href: "/admin/roles",
    label: "Rôles & permissions",
    icon: ShieldCheck,
    permission: "roles.manage",
  },
  {
    href: "/parametres",
    label: "Paramètres",
    icon: Settings,
    permission: "settings.manage",
  },
];

export function SidebarNav({
  permissions,
  appName,
  logoUrl,
}: {
  permissions: string[];
  appName: string;
  logoUrl: string | null;
}) {
  const pathname = usePathname();
  const permissionSet = new Set(permissions);
  const items = NAV_ITEMS.filter((item) => !item.permission || permissionSet.has(item.permission));

  return (
    <nav className="flex h-full w-60 flex-col border-r border-border bg-card">
      <div className="hazard-stripe h-1.5 w-full" aria-hidden="true" />
      <div className="mb-6 flex items-center gap-2 px-6 py-5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={appName} className="h-7 w-7 object-contain" />
        ) : (
          <ShieldCheck className="h-6 w-6 text-primary" />
        )}
        <span className="font-display text-lg font-bold tracking-tight">{appName}</span>
      </div>
      <ul className="flex-1 space-y-0.5 px-3">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-l-[hsl(var(--hazard))] bg-secondary text-foreground"
                    : "border-l-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
