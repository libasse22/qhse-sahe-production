import { listEpiCatalog, listEpiAssignments } from "@/lib/services/epi.service";
import { createClient } from "@/lib/supabase/server";
import { EpiManagementClient } from "@/components/epi/epi-management-client";

export default async function EpiPage() {
  const supabase = await createClient();

  const [catalogItems, assignments, profilesRes] = await Promise.all([
    listEpiCatalog(),
    listEpiAssignments(),
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
  ]);

  const profiles = (profilesRes.data || []).map((p: any) => ({
    id: p.id,
    fullName: p.full_name || p.email,
    email: p.email,
  }));

  return (
    <div className="p-6">
      <EpiManagementClient
        catalogItems={catalogItems}
        assignments={assignments}
        profiles={profiles}
      />
    </div>
  );
}
