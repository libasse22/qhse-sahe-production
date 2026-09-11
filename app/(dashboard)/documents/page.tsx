import { listDocuments, listDocumentFolders } from "@/lib/services/documents.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { DocumentLibrary } from "@/components/documents/document-library";

export default async function DocumentsPage() {
  const permissions = await getCurrentPermissions();
  const canManage = permissions.has("documents.manage");

  const [documents, folders] = await Promise.all([
    listDocuments(),
    listDocumentFolders(),
  ]);

  return <DocumentLibrary initialDocuments={documents} folders={folders} canManage={canManage} />;
}
