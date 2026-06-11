import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetAnimal,
  useListTreatments,
  useListWeightRecords,
  useDeleteAnimal,
  useUpdateTreatment,
  useDeleteWeightRecord,
  getGetAnimalQueryKey,
  getListCattleQueryKey,
  getListTreatmentsQueryKey,
  getListWeightRecordsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Edit, Trash2, Activity, Scale, Info,
  Users, Clock, Plus, CheckCircle2, TrendingUp, Minus,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AnimalFormDialog } from "@/components/animal-form-dialog";
import { TreatmentFormDialog } from "@/components/treatment-form-dialog";
import { WeightFormDialog } from "@/components/weight-form-dialog";

export function CattleDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const animalId = parseInt(id || "0", 10);

  const [editOpen, setEditOpen] = useState(false);
  const [treatmentOpen, setTreatmentOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);

  const { data: animal, isLoading } = useGetAnimal(animalId, {
    query: { enabled: !!animalId, queryKey: getGetAnimalQueryKey(animalId) },
  });

  const { data: treatments, isLoading: isTreatmentsLoading } = useListTreatments(
    { cattleId: animalId },
    { query: { enabled: !!animalId, queryKey: getListTreatmentsQueryKey({ cattleId: animalId }) } }
  );

  const { data: weightRecords, isLoading: isWeightsLoading } = useListWeightRecords(animalId, {
    query: { enabled: !!animalId, queryKey: getListWeightRecordsQueryKey(animalId) },
  });

  const deleteMutation = useDeleteAnimal({
    mutation: {
      onSuccess: () => {
        toast({ title: "Animal deleted", description: "The record has been removed." });
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        setLocation("/cattle");
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  const markCompleteMutation = useUpdateTreatment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Treatment marked complete" });
        queryClient.invalidateQueries({ queryKey: getListTreatmentsQueryKey({ cattleId: animalId }) });
      },
      onError: () => toast({ title: "Failed to update treatment", variant: "destructive" }),
    },
  });

  const deleteWeightMutation = useDeleteWeightRecord({
    mutation: {
      onSuccess: () => {
        toast({ title: "Weight entry removed" });
        queryClient.invalidateQueries({ queryKey: getListWeightRecordsQueryKey(animalId) });
        queryClient.invalidateQueries({ queryKey: getGetAnimalQueryKey(animalId) });
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
      },
      onError: () => toast({ title: "Failed to delete weight entry", variant: "destructive" }),
    },
  });

  const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    quarantined: "destructive",
    sold: "secondary",
    deceased: "secondary",
  };

  // Weight gain calculation
  const weightGain = weightRecords && weightRecords.length >= 2
    ? weightRecords[weightRecords.length - 1].weightKg - weightRecords[0].weightKg
    : null;

  const chartData = weightRecords?.map((r) => ({
    date: format(parseISO(r.recordedAt), "MMM d"),
    weight: r.weightKg,
    id: r.id,
  }));

  if (isLoading || !animal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-4 w-24" /></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/cattle"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{animal.tag}</h1>
              <Badge variant={statusColor[animal.status] ?? "outline"}>{animal.status}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">{animal.breed}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => { if (confirm("Delete this animal? This cannot be undone.")) deleteMutation.mutate({ id: animalId }); }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      {/* Top row: details + treatment history */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-muted-foreground" /> Animal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Scale className="h-3 w-3" /> Current Weight
                </p>
                <p className="text-lg font-medium">
                  {animal.weightKg != null ? `${animal.weightKg} kg` : "Not recorded"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Added
                </p>
                <p className="text-lg font-medium">
                  {format(parseISO(animal.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>

            {weightGain !== null && (
              <div className="flex items-center gap-2 bg-muted/50 rounded-md p-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Weight gain: <span className={`font-semibold ${weightGain >= 0 ? "text-primary" : "text-destructive"}`}>
                    {weightGain >= 0 ? "+" : ""}{weightGain.toFixed(1)} kg
                  </span>
                  <span className="text-muted-foreground ml-1">
                    ({weightRecords![0].recordedAt} → {weightRecords![weightRecords!.length - 1].recordedAt})
                  </span>
                </span>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Users className="h-3 w-3" /> Assigned Investor
              </p>
              {animal.investorId ? (
                <Link href={`/investors/${animal.investorId}`} className="text-primary font-medium hover:underline">
                  {animal.investorName || `Investor #${animal.investorId}`}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Unassigned</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
              <div className="text-sm bg-muted/50 p-3 rounded-md min-h-[60px]">
                {animal.notes || <span className="text-muted-foreground italic">No notes recorded</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" /> Treatment History
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setTreatmentOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            {isTreatmentsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : treatments && treatments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treatments.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.treatmentType}</TableCell>
                      <TableCell>{format(parseISO(t.scheduledDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={t.completed ? "secondary" : "default"}>
                          {t.completed ? "Done" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!t.completed && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7" title="Mark complete"
                            disabled={markCompleteMutation.isPending}
                            onClick={() => markCompleteMutation.mutate({ id: t.id, data: { completed: true } })}
                          >
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
                No treatments recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weight history section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5 text-muted-foreground" /> Weight History
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setWeightOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Record Weight
          </Button>
        </CardHeader>
        <CardContent>
          {isWeightsLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : weightRecords && weightRecords.length > 0 ? (
            <div className="space-y-6">
              {/* Line chart */}
              {weightRecords.length >= 2 && (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => `${v}kg`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} kg`, "Weight"]}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                        fontSize: "0.75rem",
                      }}
                    />
                    {animal.weightKg && (
                      <ReferenceLine
                        y={animal.weightKg}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="4 4"
                        label={{ value: "current", position: "right", fontSize: 11 }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "hsl(var(--primary))" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...weightRecords].reverse().map((r, idx, arr) => {
                    const prev = arr[idx + 1];
                    const change = prev ? r.weightKg - prev.weightKg : null;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{format(parseISO(r.recordedAt), "MMM d, yyyy")}</TableCell>
                        <TableCell className="font-semibold">{r.weightKg} kg</TableCell>
                        <TableCell>
                          {change !== null ? (
                            <span className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? "text-primary" : "text-destructive"}`}>
                              {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                              {change >= 0 ? "+" : ""}{change.toFixed(1)} kg
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.recordedBy || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{r.notes || "—"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => { if (confirm("Delete this weight entry?")) deleteWeightMutation.mutate({ id: animalId, weightId: r.id }); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Scale className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">No weight records yet</p>
              <p className="text-xs mt-1">Record the first weight to start tracking growth.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimalFormDialog open={editOpen} onOpenChange={setEditOpen} animal={animal} />
      <TreatmentFormDialog open={treatmentOpen} onOpenChange={setTreatmentOpen} prefillCattleId={animalId} />
      <WeightFormDialog open={weightOpen} onOpenChange={setWeightOpen} cattleId={animalId} />
    </div>
  );
}
