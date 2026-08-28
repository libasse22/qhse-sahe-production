"use client";

import { useEffect, useState } from "react";

export function QrCode({ value, size = 240 }: { value: string; size?: number }) {
  const [fullUrl, setFullUrl] = useState(value);

  useEffect(() => {
    if (value.startsWith("/")) {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://qhse-sahe-production.vercel.app";
      setFullUrl(`${origin}${value}`);
    } else {
      setFullUrl(value);
    }
  }, [value]);

  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(fullUrl)}`;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`QR code — ${fullUrl}`}
        width={size}
        height={size}
        className="rounded-lg border border-border bg-white p-2 shadow-sm"
      />
      <span className="font-mono text-[10px] text-muted-foreground max-w-[200px] truncate">
        {fullUrl}
      </span>
    </div>
  );
}
