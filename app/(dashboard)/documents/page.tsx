import { listDocuments } from "@/lib/services/documents.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { DocumentLibrary } from "@/components/documents/document-library";

export default async function DocumentsPage() {
  const permissions = await getCurrentPermissions();
  const canManage = permissions.has("documents.manage");
  const documents = await listDocuments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Documents QHSE</h1>
        <p className="text-muted-foreground">ISO 9001 §7.5 — procédures, formulaires et enregistrements.</p>
      </div>

      <DocumentLibrary initialDocuments={documents} canManage={canManage} />
    </div>
  );
}
