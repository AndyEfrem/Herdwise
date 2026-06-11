import { Redirect } from "wouter";
import { useGetInvestorReport, getGetInvestorReportQueryKey } from "@workspace/api-client-react";
import { useUserRole } from "@/hooks/use-user-role";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestorReportView } from "@/components/investor-report-view";
import { AlertCircle } from "lucide-react";

export function MyReport() {
  const { investorId, isInvestor, isLoading: roleLoading } = useUserRole();

  const { data: report, isLoading, isError } = useGetInvestorReport(investorId ?? 0, {
    query: {
      enabled: !roleLoading && isInvestor && investorId != null,
      queryKey: getGetInvestorReportQueryKey(investorId ?? 0),
      retry: false,
    },
  });

  // Only investors have a personal report; admins use the farm-wide Reports page.
  if (!roleLoading && !isInvestor) {
    return <Redirect to="/reports" />;
  }

  if (!roleLoading && isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">Report unavailable</h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-sm">
          We couldn't load your progress report right now. Please try again, or contact your farm administrator.
        </p>
      </div>
    );
  }

  if (roleLoading || isLoading || !report) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[320px] w-full rounded-xl" />
          <Skeleton className="h-[320px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return <InvestorReportView report={report} />;
}
