"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword, type ActionResult } from "@/lib/services/auth.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: ActionResult = { error: null };

export function ResetPasswordForm() {
  const router = useRouter();

  async function action(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
    const result = await updatePassword(formData);
    if (!result.error) {
      router.push("/login");
    }
    return result;
  }

  const [state, formAction] = useActionState(action, initialState);

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
      <SubmitButton>Mettre a jour le mot de passe</SubmitButton>
    </form>
  );
}
