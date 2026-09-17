import { listDocumentRegistry, getCompanyRetentionPolicies } from "@/lib/services/documents.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { DocumentRegistryTable } from "@/components/documents/document-registry-table";

export default async function DocumentRegistryPage(props: {
  searchParams: Promise<{ verification?: string; state?: string }>;
}) {
  const searchParams = await props.searchParams;
  const permissions = await getCurrentPermissions();
  const canManage = permissions.has("documents.manage");

  const [registryDocuments, retentionPolicies] = await Promise.all([
    listDocumentRegistry(),
    getCompanyRetentionPolicies(),
  ]);

  return (
    <DocumentRegistryTable
      documents={registryDocuments}
      retentionPolicies={retentionPolicies}
      canManage={canManage}
      initialVerificationFilter={searchParams.verification}
      initialStateFilter={searchParams.state}
    />
  );
}
