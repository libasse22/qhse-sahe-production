import { listMeetings } from "@/lib/services/meetings.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { MeetingList } from "@/components/meetings/meeting-list";

export default async function MeetingsPage() {
  const permissions = await getCurrentPermissions();
  const canManage = permissions.has("incidents.manage_all") || permissions.has("documents.manage");

  const meetings = await listMeetings();

  return <MeetingList initialMeetings={meetings} canManage={canManage} />;
}
