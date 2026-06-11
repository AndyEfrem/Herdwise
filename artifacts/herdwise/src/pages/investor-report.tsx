import { useState } from "react";
import { useParams, Link, Redirect } from "wouter";
import {
  useGetInvestorReport,
  getGetInvestorReportQueryKey,
  useGetInvestorShareLink,
  getGetInvestorShareLinkQueryKey,
  useCreateInvestorShareLink,
  useDeleteInvestorShareLink,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/use-user-role";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Share2, Copy, Check, Link2Off, Globe, AlertCircle } from "lucide-react";
import { InvestorReportView } from "@/components/investor-report-view";

function buildShareUrl(token: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}/shared-report/${token}`;
}

function ShareControls({ investorId }: { investorId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: share } = useGetInvestorShareLink(investorId, {
    query: { enabled: !!investorId, queryKey: getGetInvestorShareLinkQueryKey(investorId) },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetInvestorShareLinkQueryKey(investorId) });

  const createMutation = useCreateInvestorShareLink({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Share link ready", description: "Anyone with the link can view this report." }); },
      onError: () => toast({ title: "Failed to create link", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteInvestorShareLink({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Share link revoked" }); },
      onError: () => toast({ title: "Failed to revoke link", variant: "destructive" }),
    },
  });

  const url = share?.token ? buildShareUrl(share.token) : "";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", description: "Select and copy the link manually.", variant: "destructive" });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant={share?.enabled ? "default" : "outline"}>
          <Share2 className="h-4 w-4 mr-2" /> {share?.enabled ? "Link active" : "Share"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h4 className="font-medium text-sm">Public share link</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Generate a link this investor can open without signing in. The link shows only their cattle and progress.
          </p>
          {share?.enabled && share.token ? (
            <>
              <div className="flex gap-2">
                <Input readOnly value={url} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button size="icon" variant="outline" onClick={copy} className="flex-shrink-0">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm" variant="outline" className="flex-1"
                  disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate({ investorId })}
                >
                  Regenerate
                </Button>
                <Button
                  size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate({ investorId })}
                >
                  <Link2Off className="h-4 w-4 mr-2" /> Revoke
                </Button>
              </div>
            </>
          ) : (
            <Button
              size="sm" className="w-full"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate({ investorId })}
            >
              <Share2 className="h-4 w-4 mr-2" /> {createMutation.isPending ? "Creating..." : "Create share link"}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function InvestorReport() {
  const { id } = useParams();
  const { isAdmin, isInvestor, isLoading: roleLoading } = useUserRole();
  const investorId = parseInt(id || "0", 10);

  const { data: report, isLoading, isError } = useGetInvestorReport(investorId, {
    query: { enabled: !!investorId && !roleLoading, queryKey: getGetInvestorReportQueryKey(investorId), retry: false },
  });

  // Investors should not browse other investors' reports; send them to their own.
  if (!roleLoading && isInvestor) {
    return <Redirect to="/my-report" />;
  }

  if (!roleLoading && isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/investors/${investorId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="text-sm text-muted-foreground">Back to investor</span>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <AlertCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">Report unavailable</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-sm">
            This investor's report could not be loaded. They may have been removed.
          </p>
        </div>
      </div>
    );
  }

  if (roleLoading || isLoading || !report) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 no-print">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/investors/${investorId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <span className="text-sm text-muted-foreground">Back to investor</span>
      </div>
      <InvestorReportView
        report={report}
        shareControls={isAdmin ? <ShareControls investorId={investorId} /> : undefined}
      />
    </div>
  );
}
