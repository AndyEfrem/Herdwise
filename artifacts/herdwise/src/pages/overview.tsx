import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Box, Stethoscope, Scale } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
export function Overview() {
  const { data: summary, isLoading } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
                <Skeleton className="h-3 w-[120px] mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const safeSummary = {
    totalCattle: summary?.totalCattle ?? 0,
    activeCattle: summary?.activeCattle ?? 0,
    activeInvestors: summary?.activeInvestors ?? 0,
    averageWeightKg: summary?.averageWeightKg ?? 0,
    animalsWeighed: summary?.animalsWeighed ?? 0,
    vaccinationsDue: summary?.vaccinationsDue ?? 0,
    herdBreakdown: summary?.herdBreakdown ?? [],
    upcomingCare: summary?.upcomingCare ?? [],
  };

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Herd statistics and upcoming activities.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cattle</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeSummary.totalCattle}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {safeSummary.activeCattle} active animals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeSummary.activeInvestors}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active stakeholders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Weight</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(safeSummary.averageWeightKg)} kg
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {safeSummary.animalsWeighed} recorded weights
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vaccinations Due</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {safeSummary.vaccinationsDue}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Require attention soon
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Herd Status</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-[300px]">
            {safeSummary.herdBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={safeSummary.herdBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                  >
                    {safeSummary.herdBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">
                No herd status data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Care</CardTitle>
          </CardHeader>
          <CardContent>
            {safeSummary.upcomingCare.length > 0 ? (
              <div className="space-y-4">
                {safeSummary.upcomingCare.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">
                        Tag: {item.cattleTag}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.treatmentType}
                      </span>
                    </div>
                    <div className="text-sm">
                      {item.scheduledDate
                        ? format(parseISO(item.scheduledDate), "MMM d, yyyy")
                        : "No date"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Stethoscope className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">No upcoming care items</p>
                <p className="text-xs">Your herd is fully up to date.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
