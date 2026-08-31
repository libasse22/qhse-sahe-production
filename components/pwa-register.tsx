"use client";

import { useEffect, useState } from "react";
import { startOfflineSyncWatcher, syncAll } from "@/lib/offline/sync-manager";
import { WifiOff, Download, Smartphone, CheckCircle2, BellRing, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { PushNotificationListener, showNativePush } from "@/components/notifications/push-notification-listener";

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
      <PushNotificationListener />

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

export type SwState = "INSTALLING" | "READY" | "UPDATE_AVAILABLE" | "ERROR";

export function PwaHeaderStatus() {
  const [swState, setSwState] = useState<SwState>("INSTALLING");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState<string>("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      setSwState("ERROR");
      return;
    }

    if ("Notification" in window) {
      setPushStatus(Notification.permission);
    }

    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((reg) => {
        if (!reg) {
          setSwState("INSTALLING");
          return;
        }

        if (reg.waiting) {
          setSwState("UPDATE_AVAILABLE");
        } else if (reg.active) {
          setSwState("READY");
        } else if (reg.installing) {
          setSwState("INSTALLING");
        }

        reg.addEventListener("updatefound", () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                setSwState("UPDATE_AVAILABLE");
              } else {
                setSwState("READY");
              }
            } else if (installingWorker.state === "activated") {
              setSwState("READY");
            } else if (installingWorker.state === "redundant") {
              setSwState("ERROR");
            }
          });
        });
      })
      .catch(() => {
        setSwState("ERROR");
      });

    navigator.serviceWorker.ready
      .then(() => {
        setSwState((prev) => (prev === "UPDATE_AVAILABLE" ? prev : "READY"));
      })
      .catch(() => {
        setSwState("ERROR");
      });
  }, []);

  async function handleTestPushNotification() {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const permission = await Notification.requestPermission();
    setPushStatus(permission);

    if (permission === "granted") {
      showNativePush(
        "🚨 Test Notification Push — QHSE Duo",
        "Web Push PWA est 100% fonctionnel sur votre appareil !",
        "/incidents"
      );
    }
  }

  function getSwStatusLabel() {
    switch (swState) {
      case "READY":
        return { label: "Opérationnel (/sw.js)", color: "text-emerald-600", badge: "success" as const };
      case "UPDATE_AVAILABLE":
        return { label: "Mise à jour disponible", color: "text-blue-600", badge: "warning" as const };
      case "INSTALLING":
        return { label: "Installation...", color: "text-amber-600", badge: "warning" as const };
      case "ERROR":
      default:
        return { label: "Non actif / Erreur", color: "text-destructive", badge: "destructive" as const };
    }
  }

  const status = getSwStatusLabel();

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-accent/40 px-3 py-1 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
        title="Statut Progressive Web App (PWA)"
      >
        <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
        <span>PWA</span>
        <span
          className={`h-2 w-2 rounded-full ${
            swState === "READY" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
          }`}
        />
      </button>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" /> Application PWA QHSE Duo
              </h2>
              <Badge variant={status.badge}>{swState}</Badge>
            </div>

            <div className="space-y-2 bg-muted/30 p-3 rounded-lg border">
              <div className="flex items-center justify-between">
                <span>Service Worker Cache :</span>
                <span className={`font-semibold ${status.color} flex items-center gap-1`}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> {status.label}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Synchronisation Offline :</span>
                <span className="font-semibold text-emerald-600">IndexedDB Actif</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Notifications Push :</span>
                <Badge variant={pushStatus === "granted" ? "success" : "warning"} className="text-[10px]">
                  {pushStatus === "granted" ? "Autorisées" : "Non autorisées"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button onClick={handleTestPushNotification} variant="outline" className="w-full gap-2">
                <BellRing className="h-4 w-4 text-amber-500" /> Tester Notification Push
              </Button>
              <Button onClick={() => setDialogOpen(false)} variant="secondary" className="w-full">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
