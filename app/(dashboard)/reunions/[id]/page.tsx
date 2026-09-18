import { notFound } from "next/navigation";
import { getMeetingDetails } from "@/lib/services/meetings.service";
import { MeetingDetailWorkspace } from "@/components/meetings/meeting-detail-workspace";

interface MeetingDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const revalidate = 0;

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const details = await getMeetingDetails(id);

  if (!details) {
    notFound();
  }

  return <MeetingDetailWorkspace details={details} canManage={true} />;
}
