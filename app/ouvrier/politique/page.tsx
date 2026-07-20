import { getActivePolicy, hasAcknowledged } from "@/lib/services/policy.service";
import { AcknowledgeButton } from "@/components/policy/acknowledge-button";
import { ShieldCheck, FileDown } from "lucide-react";

export default async function OuvrierPolitiquePage() {
  const policy = await getActivePolicy();

  if (!policy) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">Politique QHSE</h1>
        <p className="text-muted-foreground">Pas encore publiée.</p>
      </div>
    );
  }

  const acknowledged = await hasAcknowledged(policy.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">{policy.title}</h1>
      </div>

      {policy.pdfUrl && (
        <a
          href={policy.pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-16 items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-card text-lg font-semibold"
        >
          <FileDown className="h-6 w-6" />
          Voir le document PDF
        </a>
      )}

      {policy.content && (
        <p className="whitespace-pre-wrap rounded-xl bg-card p-4 text-base leading-relaxed">
          {policy.content}
        </p>
      )}

      <AcknowledgeButton policyId={policy.id} alreadyAcknowledged={acknowledged} large />
    </div>
  );
}
