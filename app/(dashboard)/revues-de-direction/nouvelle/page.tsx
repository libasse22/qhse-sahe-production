import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewForm } from "@/components/reviews/review-form";
import { getCurrentPermissions } from "@/lib/services/roles.service";

export default async function NouvelleRevuePage() {
  const permissions = await getCurrentPermissions();
  if (!permissions.has("reviews.manage")) redirect("/revues-de-direction");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nouvelle revue de direction</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compte-rendu</CardTitle>
          <CardDescription>
            Reprends les indicateurs du dashboard, les résultats d&apos;audits, l&apos;avancement des objectifs et des
            actions correctives.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewForm />
        </CardContent>
      </Card>
    </div>
  );
}
