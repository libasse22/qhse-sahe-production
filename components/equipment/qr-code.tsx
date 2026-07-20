/**
 * Génère l'image du QR code via une API publique gratuite (api.qrserver.com)
 * plutôt qu'une librairie npm — évite toute nouvelle dépendance à installer.
 * Le QR encode l'URL /scan/{id}, ouverte directement par l'appareil photo
 * natif d'un téléphone (aucune app dédiée nécessaire pour scanner).
 */
export function QrCode({ value, size = 240 }: { value: string; size?: number }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`QR code — ${value}`}
      width={size}
      height={size}
      className="rounded-lg border border-border bg-white p-2"
    />
  );
}
