"use client";

import { useActionState } from "react";
import { updatePassword, type ActionResult } from "@/lib/services/auth.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = { error: null };

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: ActionResult, formData: FormData) => updatePassword(formData),
    initialState,
  );

  const success = state.error === null && Object.keys(state).length > 0;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Mise a jour..." : "Mettre a jour le mot de passe"}
      </Button>
    </form>
  );
}
