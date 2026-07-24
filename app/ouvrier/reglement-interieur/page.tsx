import { getActiveRegulation } from "@/lib/services/regulation.service";
import { ShieldCheck, FileDown } from "lucide-react";

export default async function OuvrierReglementPage() {
  const regulation = await getActiveRegulation();

  if (!regulation) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">Reglement interieur</h1>
        <p className="text-muted-foreground">Pas encore publie.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">{regulation.title}</h1>
      </div>

      {regulation.pdfUrl && (
        <a href={regulation.pdfUrl} target="_blank" rel="noreferrer" className="flex h-16 items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-card text-lg font-semibold">
          <FileDown className="h-6 w-6" />
          Voir le document PDF
        </a>
      )}

      {regulation.content && (
        <p className="whitespace-pre-wrap rounded-xl bg-card p-4 text-base leading-relaxed">
          {regulation.content}
        </p>
      )}
    </div>
  );
}
