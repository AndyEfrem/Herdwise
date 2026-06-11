import type { InvestorReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart3, Download, Printer, Scale, Boxes, Target, Stethoscope, Leaf } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import { format, parse, parseISO } from "date-fns";

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

function toCsv(report: InvestorReport): string {
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

  section("Investor", ["Field", "Value"], [
    ["Name", report.investorName],
    ["Generated", report.generatedAt],
  ]);
  section("Totals", ["Metric", "Value"], [
    ["Total cattle", report.totalCattle],
    ["Total weight (kg)", report.totalHerdWeightKg],
    ["Average weight (kg)", report.avgWeightKg],
    ["Market ready", report.marketReadyCount],
  ]);
  section("Animals", ["Tag", "Breed", "Weight (kg)", "% to target", "Status", "Market ready", "Days to market", "Projected date"],
    report.animals.map((a) => [
      a.tag, a.breed ?? "", a.weightKg ?? "", a.percentToTarget, a.status,
      a.marketReady ? "yes" : "no", a.daysToMarket ?? "", a.projectedMarketDate ?? "",
    ]));
  section("Weight Distribution", ["Range", "Count"], report.weightDistribution.map((r) => [r.range, r.count]));
  section("Growth Trend", ["Month", "Avg Weight (kg)", "Records"], report.growthTrend.map((r) => [r.month, r.avgWeightKg, r.recordCount]));
  section("Treatments by Type", ["Type", "Total", "Completed", "Pending"], report.treatmentStats.map((r) => [r.treatmentType, r.total, r.completed, r.pending]));

  return lines.join("\n");
}

function downloadCsv(report: InvestorReport) {
  const csv = toCsv(report);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = report.investorName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  a.download = `herdwise-${safeName}-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function projectionLabel(a: InvestorReport["animals"][number]): string {
  if (a.marketReady) return "Ready now";
  if (a.daysToMarket == null) return "—";
  if (a.daysToMarket <= 0) return "Ready now";
  const date = a.projectedMarketDate ? format(parseISO(a.projectedMarketDate), "MMM yyyy") : null;
  return date ? `~${a.daysToMarket}d (${date})` : `~${a.daysToMarket}d`;
}

export function InvestorReportView({
  report,
  shareControls,
}: {
  report: InvestorReport;
  shareControls?: React.ReactNode;
}) {
  const mr = report.marketReadiness;
  const marketChartData = [
    { name: "Ready", value: mr.ready },
    { name: "≤30d", value: mr.within30 },
    { name: "≤60d", value: mr.within60 },
    { name: "≤90d", value: mr.within90 },
    { name: ">90d", value: mr.beyond90 },
    { name: "No trend", value: mr.notProjectable },
  ];
  const hasGrowth = report.growthTrend.length > 0;

  return (
    <div className="space-y-8" id="report-root">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{report.investorName}</h1>
            <p className="text-muted-foreground text-sm">
              Progress report · generated {format(parseISO(report.generatedAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          {shareControls}
          <Button onClick={() => downloadCsv(report)} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Boxes className="h-4 w-4 text-muted-foreground" />} label="Cattle Owned" value={String(report.totalCattle)} sub="in your herd" />
        <StatCard icon={<Scale className="h-4 w-4 text-muted-foreground" />} label="Total Weight" value={`${report.totalHerdWeightKg.toLocaleString()} kg`} sub={`Avg ${report.avgWeightKg} kg / head`} />
        <StatCard icon={<Target className="h-4 w-4 text-emerald-600" />} label="Market Ready" value={String(report.marketReadyCount)} sub={`${mr.within30} more within 30 days`} valueClass="text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={<Stethoscope className="h-4 w-4 text-muted-foreground" />} label="Treatments Pending" value={String(report.treatmentTotals.pending)} sub={`${report.treatmentTotals.completed} of ${report.treatmentTotals.total} completed`} valueClass={report.treatmentTotals.pending > 0 ? "text-destructive" : undefined} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Growth Trend</CardTitle>
            <CardDescription>Average recorded weight per month</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {hasGrowth ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.growthTrend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
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

      {/* Per-animal progress */}
      <Card>
        <CardHeader>
          <CardTitle>Your Cattle</CardTitle>
          <CardDescription>Individual progress toward the 500 kg market target</CardDescription>
        </CardHeader>
        <CardContent>
          {report.animals.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Breed</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="w-[180px]">Progress to market</TableHead>
                    <TableHead>Outlook</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.animals.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.tag}</TableCell>
                      <TableCell>{a.breed || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{a.weightKg != null ? `${a.weightKg} kg` : "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${a.marketReady ? "bg-emerald-500" : "bg-primary"}`}
                              style={{ width: `${Math.max(2, a.percentToTarget)}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground w-9 text-right">{Math.round(a.percentToTarget)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">{projectionLabel(a)}</TableCell>
                      <TableCell>
                        {a.marketReady ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">Market ready</Badge>
                        ) : (
                          <Badge variant={a.status === "active" ? "secondary" : "outline"}>{a.status}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyChart message="No cattle assigned to this investor yet" />
          )}
        </CardContent>
      </Card>

      {/* Treatments */}
      <Card>
        <CardHeader>
          <CardTitle>Treatments by Type</CardTitle>
          <CardDescription>Health treatment completion for your cattle</CardDescription>
        </CardHeader>
        <CardContent>
          {report.treatmentStats.length > 0 ? (
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
                {report.treatmentStats.map((t) => (
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
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <BarChart3 className="h-8 w-8 mb-3 opacity-20" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
