import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { listIncidents } from "@/lib/services/incidents.service";
import { Button } from "@/components/ui/button";
import { IncidentsTable } from "@/components/incidents/incidents-table";

export default async function IncidentsPage() {
  const incidents = await listIncidents();
  const permissions = await getCurrentPermissions();

  const isQhseOrAdmin = permissions.has("incidents.manage_all");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Incidents</h1>
          <p className="text-muted-foreground">
            {isQhseOrAdmin
              ? "Tous les incidents déclarés dans l'organisation."
              : "Les incidents que vous avez déclarés ou qui vous sont assignés."}
          </p>
        </div>
        <Button asChild>
          <Link href="/incidents/nouveau">
            <Plus className="h-4 w-4" />
            Déclarer un incident
          </Link>
        </Button>
      </div>

      <IncidentsTable incidents={incidents} />
    </div>
  );
}
