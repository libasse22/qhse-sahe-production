"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, CloudUpload } from "lucide-react";
import { getPendingCount, onQueueChanged, startOfflineSyncWatcher, syncAll } from "@/lib/offline/sync-manager";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    startOfflineSyncWatcher();

    function refreshCount() {
      getPendingCount().then(setPendingCount);
    }
    refreshCount();

    const unsubscribe = onQueueChanged(refreshCount);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium ${
        isOnline ? "bg-amber-100 text-amber-900" : "bg-secondary text-foreground"
      }`}
    >
      <span className="flex items-center gap-2">
        {isOnline ? <CloudUpload className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
        {!isOnline && "Hors connexion — "}
        {pendingCount > 0
          ? `${pendingCount} signalement${pendingCount > 1 ? "s" : ""} en attente d'envoi`
          : "Connexion rétablie"}
      </span>
      {isOnline && pendingCount > 0 && (
        <button
          type="button"
          onClick={() => syncAll()}
          className="flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-semibold"
        >
          <RefreshCw className="h-3 w-3" />
          Réessayer
        </button>
      )}
    </div>
  );
}
