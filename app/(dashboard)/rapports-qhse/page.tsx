import { getMonthlyQhseReport } from "@/lib/services/qhse-reporting.service";
import { QhseReportingView } from "@/components/reporting/qhse-reporting-view";

export default async function QhseReportingPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { start, end } = await searchParams;

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const startDate = start || defaultStart;
  const endDate = end || defaultEnd;

  const report = await getMonthlyQhseReport(startDate, endDate);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <QhseReportingView
        initialReport={report}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </div>
  );
}
