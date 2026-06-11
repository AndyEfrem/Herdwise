import { useParams } from "wouter";
import { useGetSharedReport, getGetSharedReportQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestorReportView } from "@/components/investor-report-view";
import { Leaf, AlertCircle } from "lucide-react";

export function SharedReport() {
  const { token } = useParams();
  const shareToken = token ?? "";

  const { data: report, isLoading, isError } = useGetSharedReport(shareToken, {
    query: { enabled: !!shareToken, queryKey: getGetSharedReportQueryKey(shareToken), retry: false },
  });

  return (
    <div className="min-h-[100dvh] bg-muted/30">
      <header className="border-b bg-background no-print">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">H</div>
          <div>
            <p className="font-bold text-sm tracking-tight leading-none">Herdwise</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Investor Report</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6 lg:p-8">
        {isLoading ? (
          <div className="space-y-8">
            <Skeleton className="h-12 w-64" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          </div>
        ) : isError || !report ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <AlertCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold">Report unavailable</h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-sm">
              This share link is invalid or has been revoked. Please ask the farm administrator for a new link.
            </p>
          </div>
        ) : (
          <>
            <InvestorReportView report={report} />
            <footer className="mt-12 pt-6 border-t text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Leaf className="h-3.5 w-3.5" /> Powered by Herdwise
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
