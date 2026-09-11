import { notFound } from "next/navigation";
import { getDocumentDetails } from "@/lib/services/documents.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { DocumentDetail } from "@/components/documents/document-detail";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const permissions = await getCurrentPermissions();
  const canManage = permissions.has("documents.manage");

  const details = await getDocumentDetails(id);
  if (!details) {
    notFound();
  }

  return <DocumentDetail details={details} canManage={canManage} />;
}
