"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShieldCheck } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/sidebar-nav";
import { cn } from "@/lib/utils";

export function MobileNav({
  permissions,
  appName,
  logoUrl,
}: {
  permissions: string[];
  appName: string;
  logoUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const permissionSet = new Set(permissions);
  const items = NAV_ITEMS.filter((item) => !item.permission || permissionSet.has(item.permission));

  return (
    <div className="flex items-center border-b border-border bg-card px-4 py-3 md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        className="rounded-md p-2 hover:bg-accent"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="ml-2 flex items-center gap-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={appName} className="h-6 w-6 object-contain" />
        ) : (
          <ShieldCheck className="h-5 w-5 text-primary" />
        )}
        <span className="font-display text-base font-bold tracking-tight">{appName}</span>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[85vw] flex-col overflow-y-auto bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="font-display text-lg font-bold tracking-tight">{appName}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="rounded-md p-2 hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="space-y-0.5 px-3 py-3">
              {items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname?.startsWith(`${href}/`);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors",
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
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="flex-1 bg-black/40"
          />
        </div>
      )}
    </div>
  );
}
