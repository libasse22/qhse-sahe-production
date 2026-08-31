import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getAppSettings } from "@/lib/services/settings.service";
import { PwaRegister } from "@/components/pwa-register";

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  return {
    title: {
      default: settings.appName,
      template: `%s | ${settings.appName}`,
    },
    description: `Plateforme de gestion QHSE — ${settings.appName}`,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: settings.appName,
    },
    icons: {
      icon: [
        { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon.svg", type: "image/svg+xml" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
