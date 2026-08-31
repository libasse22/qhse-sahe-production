"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, AlertTriangle, Smartphone, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getPushSubscriptionStatus,
  subscribePushDevice,
  unsubscribePushDevice,
} from "@/lib/services/web-push.service";

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

export function PushSubscriptionToggle() {
  const [isSupported, setIsSupported] = useState(true);
  const [permission, setPermission] = useState<string>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Détection iOS
    const ua = window.navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIos(iosDevice);

    // Détection Mode Web App Standalone
    const standaloneMode =
      (window.navigator as any).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standaloneMode);

    // Support des APIs Web Push
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);

    if (supported && "Notification" in window) {
      setPermission(Notification.permission);
      getPushSubscriptionStatus()
        .then((res) => setIsSubscribed(res.isSubscribed))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function handleToggleSubscription() {
    setErrorMsg(null);
    setLoading(true);

    try {
      if (!isSupported) {
        throw new Error("Les notifications Push ne sont pas supportées par ce navigateur.");
      }

      if (isSubscribed) {
        // Désabonnement
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await unsubscribePushDevice(sub.endpoint);
        }
        setIsSubscribed(false);
      } else {
        // Demande de permission initiée par geste utilisateur
        const newPermission = await Notification.requestPermission();
        setPermission(newPermission);

        if (newPermission !== "granted") {
          throw new Error("L'autorisation de notification a été refusée.");
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error("Clé VAPID publique non configurée sur le serveur.");
        }

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
          });
        }

        const subJson = sub.toJSON();
        if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
          throw new Error("Données d'abonnement Web Push invalides.");
        }

        const res = await subscribePushDevice(
          {
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
          },
          navigator.userAgent
        );

        if (res.error) throw new Error(res.error);
        setIsSubscribed(true);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de la mise à jour des notifications.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg border bg-muted/20">
        <Loader2 className="h-4 w-4 animate-spin" /> Vérification du statut des notifications...
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          <div>
            <div className="font-semibold text-sm">Notifications Web Push Natives</div>
            <div className="text-muted-foreground text-[11px]">
              Alertes en arrière-plan et application fermée (Android, iOS & Desktop)
            </div>
          </div>
        </div>

        <div>
          {isSubscribed ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Activées 🟢
            </Badge>
          ) : permission === "denied" ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Refusées 🔴
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              ⚪ Désactivées
            </Badge>
          )}
        </div>
      </div>

      {/* Guidage spécifique iPhone / iOS s'il est ouvert dans Safari (non-standalone) */}
      {isIos && !isStandalone && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
          <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Installation requise sur iPhone / iPad</div>
            <div>
              Pour recevoir les notifications sur iOS, ajoutez l'application à l'écran d'accueil Safari via le bouton{" "}
              <span className="font-semibold">Partager ⎋</span> puis <span className="font-semibold">Sur l'écran d'accueil ➕</span>.
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-destructive/10 p-2.5 text-destructive font-medium border border-destructive/20">
          {errorMsg}
        </div>
      )}

      <div className="pt-1 flex items-center justify-between border-t border-border">
        <span className="text-muted-foreground">
          {isSubscribed
            ? "Vos périphériques recevront les alertes en direct."
            : "Activez pour recevoir les alertes sur cet appareil."}
        </span>

        <Button
          onClick={handleToggleSubscription}
          disabled={loading || !isSupported || (isIos && !isStandalone && permission !== "granted")}
          variant={isSubscribed ? "outline" : "default"}
          size="sm"
          className="gap-2 font-medium"
        >
          {isSubscribed ? (
            <>
              <BellOff className="h-3.5 w-3.5" /> Désactiver
            </>
          ) : (
            <>
              <Bell className="h-3.5 w-3.5" /> Activer les notifications
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
