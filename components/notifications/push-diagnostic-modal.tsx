"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Smartphone,
  RefreshCw,
  Send,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { sendTestPushToCurrentUser, subscribePushDevice } from "@/lib/services/web-push.service";
import { VAPID_PUBLIC_KEY } from "@/lib/constants/vapid";

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

export interface DiagnosticState {
  userId: string | null;
  userEmail: string | null;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotificationApi: boolean;
  permission: string;
  isIos: boolean;
  isStandalone: boolean;
  swStatus: "ACTIVE" | "WAITING" | "NONE" | "ERROR";
  localSubscription: string | null;
  supabaseTokenCount: number | null;
  supabaseError: string | null;
}

export function PushDiagnosticModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [diag, setDiag] = useState<DiagnosticState | null>(null);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  async function runDiagnostic() {
    setLoading(true);
    setTestResult(null);

    const state: DiagnosticState = {
      userId: null,
      userEmail: null,
      hasServiceWorker: typeof window !== "undefined" && "serviceWorker" in navigator,
      hasPushManager: typeof window !== "undefined" && "PushManager" in window,
      hasNotificationApi: typeof window !== "undefined" && "Notification" in window,
      permission: typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
      isIos: false,
      isStandalone: false,
      swStatus: "NONE",
      localSubscription: null,
      supabaseTokenCount: null,
      supabaseError: null,
    };

    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      state.isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      state.isStandalone =
        (navigator as any).standalone === true || window.matchMedia("(display-mode: standalone)").matches;

      // Supabase user
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        state.userId = user.id;
        state.userEmail = user.email || null;

        // Count subscriptions in DB
        const { count, error } = await supabase
          .from("push_subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (error) {
          state.supabaseError = error.message;
        } else {
          state.supabaseTokenCount = count ?? 0;
        }
      }

      // Check Service Worker
      if (state.hasServiceWorker) {
        try {
          const reg = await navigator.serviceWorker.getRegistration("/sw.js");
          if (reg?.active) {
            state.swStatus = "ACTIVE";
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
              state.localSubscription = sub.endpoint;
            }
          } else if (reg?.waiting || reg?.installing) {
            state.swStatus = "WAITING";
          }
        } catch (e: any) {
          state.swStatus = "ERROR";
          state.supabaseError = e?.message || "Erreur inspection Service Worker";
        }
      }
    }

    setDiag(state);
    setLoading(false);
  }

  useEffect(() => {
    if (open) {
      void runDiagnostic();
    }
  }, [open]);

  async function handleAutoRepair() {
    setRepairing(true);
    setTestResult(null);

    try {
      if (!("Notification" in window)) {
        throw new Error("L'API Notification n'est pas disponible sur cet appareil.");
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        throw new Error("L'autorisation de notification a été refusée par l'utilisateur.");
      }

      if (!("serviceWorker" in navigator)) {
        throw new Error("Les Service Workers ne sont pas supportés par ce navigateur.");
      }

      // 1. Enregistrer le SW au besoin
      let reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js");
      }
      await navigator.serviceWorker.ready;

      // 2. Nettoyer tout ancien jeton corrompu
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        try {
          await sub.unsubscribe();
        } catch {
          // Ignoré
        }
      }

      // 3. Ré-abonner avec la clé VAPID valide
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });

      const subJson = sub.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error("Le navigateur n'a pas généré de clés Push valides.");
      }

      // 4. Enregistrer dans Supabase
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

      if (res.error) {
        throw new Error(res.error);
      }

      setTestResult({
        success: true,
        message: "Réparation réussie ! Votre téléphone est enregistré dans Supabase.",
      });

      await runDiagnostic();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Erreur lors de la réparation automatique.",
      });
    } finally {
      setRepairing(false);
    }
  }

  async function handleSendServerTest() {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await sendTestPushToCurrentUser();
      if (res.error) {
        setTestResult({
          success: false,
          message: res.error,
        });
      } else {
        setTestResult({
          success: true,
          message:
            "⚡ Notification expédiée par le serveur ! Regardez le haut de l'écran ou le centre de notification de votre téléphone.",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Erreur lors de l'expédition du test Push.",
      });
    } finally {
      setTesting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Smartphone className="h-5 w-5 text-emerald-500" />
            <span>Diagnostic Approfondi Web Push Mobile</span>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
            ✕
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>Analyse de la configuration du téléphone...</p>
          </div>
        ) : diag ? (
          <div className="space-y-3">
            {/* Guide iPhone spécifique */}
            {diag.isIos && !diag.isStandalone && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-amber-800 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                  <Info className="h-4 w-4 shrink-0" /> Exigence Apple iPhone / Safari
                </div>
                <p className="text-[11px] leading-relaxed">
                  Sur iOS (iPhone/iPad), Apple exige d'ajouter l'application à l'écran d'accueil avant d'autoriser les notifications Push :
                  <br />
                  1. Appuyez sur le bouton **Partager ⎋** dans Safari.
                  <br />
                  2. Choisissez **Sur l'écran d'accueil ➕**.
                  <br />
                  3. Ouvrez **QHSE Duo** depuis l'écran d'accueil.
                </p>
              </div>
            )}

            {/* Grille de Diagnostic */}
            <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border">
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span>Navigateur Compatible :</span>
                {diag.hasServiceWorker && diag.hasPushManager && diag.hasNotificationApi ? (
                  <Badge variant="success" className="gap-1 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" /> Compatible
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 text-[10px]">
                    <XCircle className="h-3 w-3" /> Incompatible
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span>Permission Notifications :</span>
                <Badge
                  variant={
                    diag.permission === "granted"
                      ? "success"
                      : diag.permission === "denied"
                      ? "destructive"
                      : "warning"
                  }
                  className="text-[10px]"
                >
                  {diag.permission === "granted"
                    ? "Autorisées 🟢"
                    : diag.permission === "denied"
                    ? "Bloquées/Refusées 🔴"
                    : "Non demandées ⚪"}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span>Service Worker (`/sw.js`) :</span>
                <Badge
                  variant={diag.swStatus === "ACTIVE" ? "success" : "destructive"}
                  className="text-[10px]"
                >
                  {diag.swStatus === "ACTIVE" ? "Actif & Opérationnel" : "Non actif"}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span>Jeton Local Navigateur :</span>
                <Badge
                  variant={diag.localSubscription ? "success" : "warning"}
                  className="text-[10px]"
                >
                  {diag.localSubscription ? "Généré 🟢" : "Absent ⚪"}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1">
                <span>Enregistrements Supabase DB :</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {diag.supabaseTokenCount !== null ? `${diag.supabaseTokenCount} jeton(s)` : "Erreur DB"}
                </span>
              </div>
            </div>

            {diag.supabaseError && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px]">
                ⚠️ Erreur détectée : {diag.supabaseError}
              </div>
            )}

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-[11px] font-medium ${
                  testResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}
              >
                {testResult.message}
              </div>
            )}

            {/* Actions de Réparation et Test */}
            <div className="space-y-2 pt-2">
              <Button
                onClick={handleSendServerTest}
                disabled={testing || repairing || diag.permission !== "granted"}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                1. Tester la Réception Push Serveur 📱
              </Button>

              <Button
                onClick={handleAutoRepair}
                disabled={repairing || testing}
                variant="outline"
                className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10 font-semibold"
              >
                {repairing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                2. Lancer la Réparation Automatique 🛠️
              </Button>

              <Button onClick={runDiagnostic} variant="ghost" className="w-full text-muted-foreground text-[11px]">
                Actualiser le diagnostic
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
