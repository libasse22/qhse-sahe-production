import { Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/services/auth.service";

export default function EnAttentePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center">
          <Clock className="mb-2 h-10 w-10 text-primary" />
          <CardTitle>Compte en attente de validation</CardTitle>
          <CardDescription>
            Votre inscription a bien été enregistrée. Un administrateur doit valider
            votre compte avant que vous puissiez accéder à l&apos;application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">
              Déconnexion
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
