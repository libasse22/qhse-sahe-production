"use client";

import { useActionState } from "react";
import { updateAppName } from "@/lib/services/settings.service";
import type { ActionResult } from "@/lib/services/auth.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: ActionResult = { error: null };

export function AppNameForm({ currentName }: { currentName: string }) {
  const [state, formAction] = useActionState(
    async (_prev: ActionResult, formData: FormData) => updateAppName(formData),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="appName">Nom de l&apos;application</Label>
        <Input id="appName" name="appName" required maxLength={80} defaultValue={currentName} />
        <p className="text-xs text-muted-foreground">
          Affiché dans le menu, les pages de connexion et le titre de l&apos;onglet du navigateur.
        </p>
      </div>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton>Enregistrer le nom</SubmitButton>
    </form>
  );
}
