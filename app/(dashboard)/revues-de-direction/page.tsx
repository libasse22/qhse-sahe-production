import Link from "next/link";
import { Plus } from "lucide-react";
import { listManagementReviews } from "@/lib/services/reviews.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function RevuesDeDirectionPage() {
  const [reviews, permissions] = await Promise.all([listManagementReviews(), getCurrentPermissions()]);
  const canManage = permissions.has("reviews.manage");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Revues de direction</h1>
          <p className="text-muted-foreground">ISO 9001 §9.3 / 14001 §9.3 / 45001 §9.3</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/revues-de-direction/nouvelle">
              <Plus className="h-4 w-4" />
              Nouvelle revue
            </Link>
          </Button>
        )}
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Aucune revue de direction enregistrée.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-base">{r.title}</CardTitle>
                <CardDescription>
                  {new Date(r.reviewDate).toLocaleDateString("fr-FR")} — animée par {r.createdByName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{r.summary}</p>
                {r.decisions && (
                  <div className="rounded-md bg-secondary/50 p-3 text-sm">
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Décisions</p>
                    {r.decisions}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
