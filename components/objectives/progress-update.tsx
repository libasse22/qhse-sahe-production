"use client";

import { useState, useTransition } from "react";
import { updateObjectiveProgress } from "@/lib/services/objectives.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ProgressUpdate({ objectiveId, currentValue }: { objectiveId: string; currentValue: number }) {
  const [value, setValue] = useState(String(currentValue));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateObjectiveProgress(objectiveId, formData);
      if (result.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex items-center gap-2">
      <Input
        name="currentValue"
        type="number"
        step="any"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-24"
      />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? "…" : "Mettre à jour"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
