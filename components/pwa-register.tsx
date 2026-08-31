"use client";

import { useEffect, useState } from "react";
import { startOfflineSyncWatcher, syncAll } from "@/lib/offline/sync-manager";
import { WifiOff, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaRegister() {
  const [isOffline, setIsOffline] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Démarrer le surveillant de synchro offline IndexedDB -> Supabase
    startOfflineSyncWatcher();

    // 2. Gestion de l'état réseau
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);

      const handleOnline = () => {
        setIsOffline(false);
        void syncAll();
      };
      const handleOffline = () => setIsOffline(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // 3. Enregistrement du Service Worker
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("Service Worker QHSE Duo actif sur le scope:", reg.scope);
          })
          .catch((err) => {
            console.warn("Service worker non enregistré:", err);
          });
      }

      // 4. Capture de la demande d'installation PWA
      const handleInstallPrompt = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", handleInstallPrompt);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      };
    }
  }, []);

  async function handleInstallPwa() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  }

  return (
    <>
      {/* Banner Mode Hors-Ligne */}
      {isOffline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
          <WifiOff className="h-4 w-4" /> Mode Hors-Ligne — Saisies conservées localement
        </div>
      )}

      {/* Invite d'installation PWA */}
      {installPrompt && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-primary/20 bg-card p-3 shadow-2xl">
          <div className="text-xs">
            <div className="font-bold">Installer l'application QHSE Duo</div>
            <div className="text-muted-foreground text-[11px]">Accès rapide & mode hors-ligne</div>
          </div>
          <Button size="sm" onClick={handleInstallPwa} className="gap-1.5 bg-primary text-white">
            <Download className="h-3.5 w-3.5" /> Installer
          </Button>
        </div>
      )}
    </>
  );
}
