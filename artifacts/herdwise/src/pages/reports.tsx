import { Redirect } from "wouter";
import { useGetReportsSummary, getGetReportsSummaryQueryKey } from "@workspace/api-client-react";
import type { ReportsSummary } from "@workspace/api-client-react";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, Download, Scale, Boxes, Target, Stethoscope } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { format, parse } from "date-fns";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function formatMonth(month: string): string {
  try {
    return format(parse(month, "yyyy-MM", new Date()), "MMM yyyy");
  } catch {
    return month;
  }
}

function toCsv(summary: ReportsSummary): string {
  const lines: string[] = [];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const section = (title: string, headers: string[], rows: (string | number)[][]) => {
    lines.push(title);
    lines.push(headers.map(esc).join(","));
    for (const r of rows) lines.push(r.map(esc).join(","));
    lines.push("");
  };

  section("Herd Totals", ["Metric", "Value"], [
    ["Total cattle", summary.totalCattle],
    ["Total herd weight (kg)", summary.totalHerdWeightKg],
    ["Average weight (kg)", summary.avgWeightKg],
  ]);
  section("By Breed", ["Breed", "Count"], summary.byBreed.map((r) => [r.label, r.count]));
  section("By Sex", ["Sex", "Count"], summary.bySex.map((r) => [r.label, r.count]));
  section("By Stage", ["Stage", "Count"], summary.byStage.map((r) => [r.label, r.count]));
  section("By Status", ["Status", "Count"], summary.byStatus.map((r) => [r.label, r.count]));
  section("Weight Distribution", ["Range", "Count"], summary.weightDistribution.map((r) => [r.range, r.count]));
  section("Market Readiness", ["Bucket", "Count"], [
    ["Ready now", summary.marketReadiness.ready],
    ["Within 30 days", summary.marketReadiness.within30],
    ["Within 60 days", summary.marketReadiness.within60],
    ["Within 90 days", summary.marketReadiness.within90],
    ["Beyond 90 days", summary.marketReadiness.beyond90],
    ["Not projectable", summary.marketReadiness.notProjectable],
  ]);
  section("Growth Trend", ["Month", "Avg Weight (kg)", "Records"], summary.growthTrend.map((r) => [r.month, r.avgWeightKg, r.recordCount]));
  section("Treatments by Type", ["Type", "Total", "Completed", "Pending"], summary.treatmentStats.map((r) => [r.treatmentType, r.total, r.completed, r.pending]));
  section("Investor Breakdown", ["Investor", "Cattle", "Total Weight (kg)", "Market Ready"], summary.investorBreakdown.map((r) => [r.name, r.cattleCount, r.totalWeightKg, r.marketReadyCount]));

  return lines.join("\n");
}

function downloadCsv(summary: ReportsSummary) {
  const csv = toCsv(summary);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `herdwise-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function Reports() {
  const { isInvestor, isLoading: roleLoading } = useUserRole();
  const { data: summary, isLoading } = useGetReportsSummary({
    query: { enabled: !roleLoading && !isInvestor, queryKey: getGetReportsSummaryQueryKey() },
  });

  if (!roleLoading && isInvestor) {
    return <Redirect to="/overview" />;
  }

  if (roleLoading || isLoading || !summary) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">Analytics and exports for your farm operations.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[320px] w-full rounded-xl" />
          <Skeleton className="h-[320px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const mr = summary.marketReadiness;
  const marketChartData = [
    { name: "Ready now", value: mr.ready },
    { name: "≤30 days", value: mr.within30 },
    { name: "≤60 days", value: mr.within60 },
    { name: "≤90 days", value: mr.within90 },
    { name: ">90 days", value: mr.beyond90 },
    { name: "No trend", value: mr.notProjectable },
  ];

  const hasGrowth = summary.growthTrend.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">Analytics and exports for your farm operations.</p>
        </div>
        <Button onClick={() => downloadCsv(summary)} variant="outline" data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Boxes className="h-4 w-4 text-muted-foreground" />} label="Total Cattle" value={String(summary.totalCattle)} sub={`${summary.byStatus.find((s) => s.label === "active")?.count ?? 0} active`} />
        <StatCard icon={<Scale className="h-4 w-4 text-muted-foreground" />} label="Total Herd Weight" value={`${summary.totalHerdWeightKg.toLocaleString()} kg`} sub={`Avg ${summary.avgWeightKg} kg / head`} />
        <StatCard icon={<Target className="h-4 w-4 text-emerald-600" />} label="Market Ready" value={String(mr.ready)} sub={`${mr.within30} more within 30 days`} valueClass="text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={<Stethoscope className="h-4 w-4 text-muted-foreground" />} label="Treatments Pending" value={String(summary.treatmentTotals.pending)} sub={`${summary.treatmentTotals.completed} of ${summary.treatmentTotals.total} completed`} valueClass={summary.treatmentTotals.pending > 0 ? "text-destructive" : undefined} />
      </div>

      {/* Growth + Market readiness */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Herd Growth Trend</CardTitle>
            <CardDescription>Average recorded weight per month</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {hasGrowth ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.growthTrend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" unit="kg" width={56} />
                  <Tooltip labelFormatter={(l) => formatMonth(String(l))} formatter={(v: number) => [`${v} kg`, "Avg weight"]} />
                  <Line type="monotone" dataKey="avgWeightKg" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No weight history recorded yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Market Readiness</CardTitle>
            <CardDescription>Projected time to reach 500 kg sale weight</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marketChartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" allowDecimals={false} width={28} />
                <Tooltip formatter={(v: number) => [v, "Cattle"]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {marketChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Composition + Weight distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Herd Composition</CardTitle>
            <CardDescription>Breakdown by breed</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {summary.byBreed.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.byBreed} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="count" nameKey="label">
                    {summary.byBreed.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No cattle recorded" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weight Distribution</CardTitle>
            <CardDescription>Number of animals per weight band</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.weightDistribution} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" allowDecimals={false} width={28} />
                <Tooltip formatter={(v: number) => [v, "Cattle"]} />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Treatments + Investors tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Treatments by Type</CardTitle>
            <CardDescription>Completion status across all treatments</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.treatmentStats.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.treatmentStats.map((t) => (
                    <TableRow key={t.treatmentType}>
                      <TableCell className="font-medium">{t.treatmentType}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.total}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{t.completed}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.pending > 0 ? <Badge variant="destructive">{t.pending}</Badge> : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyChart message="No treatments recorded" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Investor Holdings</CardTitle>
            <CardDescription>Cattle and weight per investor</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.investorBreakdown.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Cattle</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Ready</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.investorBreakdown.map((inv) => (
                    <TableRow key={inv.investorId}>
                      <TableCell className="font-medium">{inv.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{inv.cattleCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{inv.totalWeightKg.toLocaleString()} kg</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {inv.marketReadyCount > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{inv.marketReadyCount}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyChart message="No investor assignments yet" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, valueClass }: { icon: React.ReactNode; label: string; value: string; sub: string; valueClass?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClass ?? ""}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center text-muted-foreground">
      <BarChart3 className="h-8 w-8 mb-3 opacity-20" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
