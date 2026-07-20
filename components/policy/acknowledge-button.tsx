"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { acknowledgePolicy } from "@/lib/services/policy.service";
import { Button } from "@/components/ui/button";

export function AcknowledgeButton({
  policyId,
  alreadyAcknowledged,
  large = false,
}: {
  policyId: string;
  alreadyAcknowledged: boolean;
  large?: boolean;
}) {
  const [done, setDone] = useState(alreadyAcknowledged);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await acknowledgePolicy(policyId);
      if (result.error) {
        setError(result.error);
      } else {
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-xl bg-emerald-100 text-emerald-700 ${large ? "h-16 text-lg" : "h-10 text-sm"} font-semibold`}
      >
        <CheckCircle2 className={large ? "h-6 w-6" : "h-4 w-4"} />
        Lu et compris
      </div>
    );
  }

  return (
    <div>
      <Button
        onClick={handleClick}
        disabled={isPending}
        size={large ? "lg" : "default"}
        className={large ? "h-16 w-full text-lg font-bold" : ""}
      >
        <CheckCircle2 className={large ? "h-6 w-6" : "h-4 w-4"} />
        {isPending ? "Enregistrement…" : "J'ai lu et compris"}
      </Button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
