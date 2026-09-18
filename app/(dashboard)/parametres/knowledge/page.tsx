import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { getKnowledgeSources, getKnowledgeStats } from "@/lib/services/knowledge.service";
import { createClient } from "@/lib/supabase/server";
import { KnowledgeManagerClient } from "@/components/knowledge/knowledge-manager-client";

export const metadata = {
  title: "Base de Connaissances QHSE | QHSE Duo Sénégal",
  description: "Gestion et structuration des connaissances métiers, cours, normes et documents GED.",
};

export default async function KnowledgeParametresPage() {
  const profile = await getCurrentProfile();
  const permissions = await getCurrentPermissions();

  if (!profile || !permissions.has("settings.manage")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch initial knowledge sources & stats
  const sources = await getKnowledgeSources();
  const stats = await getKnowledgeStats();

  // Fetch GED documents for integration picker
  const { data: gedDocs } = await supabase
    .from("documents")
    .select("id, title, code, domain")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <KnowledgeManagerClient
        initialSources={sources}
        initialStats={stats}
        gedDocuments={gedDocs || []}
      />
    </div>
  );
}
