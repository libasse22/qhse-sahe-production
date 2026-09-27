"use client";

import { useEffect, useState } from "react";
import { Bell, ShieldAlert, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribePushDevice } from "@/lib/services/web-push.service";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const DISMISS_KEY = "qhse_push_banner_dismissed_until";

export function PushPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    // Si les notifications sont déjà autorisées ou refusées
    if (Notification.permission !== "default") {
      return;
    }

    // Vérifier si l'utilisateur a cliqué sur "Plus tard" récemment
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // Afficher la bannière après 2 secondes pour ne pas surcharger l'utilisateur au chargement
    const timer = setTimeout(() => {
      setVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  async function handleEnablePush() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (vapidPublicKey && "serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          let sub = await reg.pushManager.getSubscription();
          if (!sub) {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
            });
          }
          const subJson = sub.toJSON();
          if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
            await subscribePushDevice(
              {
                endpoint: subJson.endpoint,
                keys: {
                  p256dh: subJson.keys.p256dh,
                  auth: subJson.keys.auth,
                },
              },
              navigator.userAgent
            );
          }
        }
        setSuccess(true);
        setTimeout(() => {
          setVisible(false);
        }, 3000);
      } else {
        setVisible(false);
      }
    } catch (err) {
      console.warn("Erreur lors de l'activation Web Push :", err);
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    // Masquer pour 7 jours
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, (Date.now() + sevenDays).toString());
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl text-white">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-slate-400 hover:text-white p-1 rounded-full transition-colors"
          title="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6 sm:pr-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {success ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Bell className="h-5 w-5 animate-pulse" />}
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold flex items-center gap-1.5 text-emerald-300">
              <ShieldAlert className="h-4 w-4 text-emerald-400" />
              {success ? "Notifications activées !" : "Activer les alertes PWA en arrière-plan"}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {success
                ? "Vous recevrez désormais les alertes et signalements d'urgence même si l'application est fermée."
                : "Soyez informé instantanément des nouveaux signalements d'urgence et messages, même lorsque l'application QHSE est fermée."}
            </p>
          </div>
        </div>

        {!success && (
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-xs text-slate-400 hover:text-white hover:bg-slate-800 w-1/2 sm:w-auto"
            >
              Plus tard
            </Button>
            <Button
              size="sm"
              onClick={handleEnablePush}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 shadow-lg shadow-emerald-900/40 w-1/2 sm:w-auto"
            >
              <Bell className="h-3.5 w-3.5" />
              {loading ? "Activation..." : "Activer"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
