"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ActionResult } from "@/lib/services/auth.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: ActionResult = { error: null };

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    async (_prev: ActionResult, formData: FormData) => requestPasswordReset(formData),
    initialState,
  );

  if (state.error === null && (state as any).submitted) {
    return (
      <p className="text-sm text-muted-foreground">
        Si un compte existe avec cette adresse, un e-mail de reinitialisation a ete envoye.
      </p>
    );
  }

  return (
    <form action={async (fd) => { await formAction(fd); (state as any).submitted = true; }} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton>Envoyer le lien de reinitialisation</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Retour a la connexion
        </Link>
      </p>
    </form>
  );
}
