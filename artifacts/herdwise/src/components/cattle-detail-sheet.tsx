import { useState } from "react";
import { useLocation } from "wouter";
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  Edit, Trash2, CheckSquare, Square, TrendingUp, Minus, Scale,
  Tag, Calendar, Users, Activity, CheckCircle2, Target, Rocket,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AnimalFormDialog } from "@/components/animal-form-dialog";
import { TreatmentFormDialog } from "@/components/treatment-form-dialog";
import { WeightFormDialog } from "@/components/weight-form-dialog";
import { useUserRole } from "@/hooks/use-user-role";

const SEX_DISPLAY: Record<string, string> = { male: "Male (M)", female: "Female (F)" };

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  quarantined: "destructive",
  sold: "secondary",
  deceased: "secondary",
};

interface CattleDetailSheetProps {
  animalId: number | null;
  onClose: () => void;
}

export function CattleDetailSheet({ animalId, onClose }: CattleDetailSheetProps) {
  const open = animalId !== null;
  const id = animalId ?? 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const [, setLocation] = useLocation();

  const [editOpen, setEditOpen] = useState(false);
  const [treatmentOpen, setTreatmentOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);

  const { data: animal, isLoading } = useGetAnimal(id, {
    query: { enabled: open, queryKey: getGetAnimalQueryKey(id) },
  });

  const { data: treatments } = useListTreatments(
    { cattleId: id },
    { query: { enabled: open, queryKey: getListTreatmentsQueryKey({ cattleId: id }) } }
  );

  const { data: weightRecords } = useListWeightRecords(id, {
    query: { enabled: open, queryKey: getListWeightRecordsQueryKey(id) },
  });

  const deleteMutation = useDeleteAnimal({
    mutation: {
      onSuccess: () => {
        toast({ title: "Animal deleted" });
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        onClose();
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  const markCompleteMutation = useUpdateTreatment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTreatmentsQueryKey({ cattleId: id }) });
      },
    },
  });

  const deleteWeightMutation = useDeleteWeightRecord({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWeightRecordsQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetAnimalQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
      },
    },
  });

  // Determine which arrival treatments were done
  const has3in1 = treatments?.some((t) => t.treatmentType === "3in1") ?? false;
  const hasDose = treatments?.some((t) => t.treatmentType === "Dose") ?? false;
  const hasDip  = treatments?.some((t) => t.treatmentType === "Dip") ?? false;
  const hasIsd  = treatments?.some((t) => t.treatmentType === "Isd") ?? false;

  const weightGain = weightRecords && weightRecords.length >= 2
    ? weightRecords[weightRecords.length - 1].weightKg - weightRecords[0].weightKg
    : null;

  const chartData = weightRecords?.map((r) => ({
    date: format(parseISO(r.recordedAt), "MMM d"),
    weight: r.weightKg,
  }));

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[580px] overflow-y-auto p-0"
        >
          {isLoading || !animal ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 pr-12">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <SheetTitle className="text-xl font-bold">{animal.tag}</SheetTitle>
                      <Badge variant={statusColor[animal.status] ?? "outline"}>{animal.status}</Badge>
                      {animal.sex && <Badge variant="outline">{SEX_DISPLAY[animal.sex] ?? animal.sex}</Badge>}
                      {animal.stage && <Badge variant="outline">{animal.stage}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {animal.breed}{animal.description ? ` — ${animal.description}` : ""}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm" variant="destructive"
                        onClick={() => { if (confirm(`Delete ${animal.tag}?`)) deleteMutation.mutate({ id }); }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-5 space-y-6">
                {/* ── Animal Details ── */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Animal Details
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1 mb-0.5">
                        <Tag className="h-3 w-3" /> Current Tag
                      </p>
                      <p className="font-semibold">{animal.tag}</p>
                    </div>
                    {animal.previousTag && (
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1 mb-0.5">
                          <Tag className="h-3 w-3" /> Previous Tag
                        </p>
                        <p className="font-medium">{animal.previousTag}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground mb-0.5">Lot No.</p>
                      <p className="font-medium font-mono">
                        {animal.lotNumber ? `Lot ${animal.lotNumber}` : <span className="text-muted-foreground not-italic font-normal">Private sale</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Breed</p>
                      <p className="font-medium">{animal.breed}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Sex</p>
                      <p className="font-medium">{animal.sex ? SEX_DISPLAY[animal.sex] ?? animal.sex : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Stage</p>
                      <p className="font-medium">{animal.stage || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1 mb-0.5">
                        <Scale className="h-3 w-3" /> Weight
                      </p>
                      <p className="font-semibold">
                        {animal.weightKg != null ? `${animal.weightKg} kg` : "—"}
                        {weightGain !== null && (
                          <span className={`ml-2 text-xs font-normal ${weightGain >= 0 ? "text-primary" : "text-destructive"}`}>
                            ({weightGain >= 0 ? "+" : ""}{weightGain.toFixed(1)} kg total)
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1 mb-0.5">
                        <Calendar className="h-3 w-3" /> Date Received
                      </p>
                      <p className="font-medium">
                        {animal.dateReceived ? format(parseISO(animal.dateReceived), "dd MMM yyyy") : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1 mb-0.5">
                        <Users className="h-3 w-3" /> Owner
                      </p>
                      <p className="font-medium">{animal.investorName || "Unassigned"}</p>
                    </div>
                  </div>
                  {animal.description && (
                    <div className="mt-3">
                      <p className="text-muted-foreground text-sm mb-1">Description</p>
                      <p className="text-sm bg-muted/50 rounded px-3 py-2">{animal.description}</p>
                    </div>
                  )}
                  {animal.notes && (
                    <div className="mt-3">
                      <p className="text-muted-foreground text-sm mb-1">Notes</p>
                      <p className="text-sm bg-muted/50 rounded px-3 py-2">{animal.notes}</p>
                    </div>
                  )}
                </section>

                <Separator />

                {/* ── Arrival Treatments (paper form checkboxes) ── */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Arrival Treatments
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "3in1", done: has3in1 },
                      { label: "Dose", done: hasDose },
                      { label: "Dip",  done: hasDip },
                      { label: "Isd",  done: hasIsd },
                    ].map(({ label, done }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-2.5 border rounded-md px-3 py-2.5 text-sm font-medium ${
                          done ? "border-primary/30 bg-primary/5 text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {done
                          ? <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
                          : <Square className="h-4 w-4 shrink-0" />
                        }
                        {label}
                      </div>
                    ))}
                  </div>
                </section>

                <Separator />

                {/* ── Treatment History ── */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" /> Treatment History
                    </h3>
                    {isAdmin && (
                      <Button size="sm" variant="outline" onClick={() => setTreatmentOpen(true)}>
                        + Add
                      </Button>
                    )}
                  </div>
                  {treatments && treatments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {treatments.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.treatmentType}</TableCell>
                            <TableCell className="text-sm">{format(parseISO(t.scheduledDate), "dd MMM yyyy")}</TableCell>
                            <TableCell>
                              <Badge variant={t.completed ? "secondary" : "default"}>
                                {t.completed ? "Done" : "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {!t.completed && isAdmin && (
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
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
                    <p className="text-sm text-muted-foreground text-center py-4">No treatments recorded.</p>
                  )}
                </section>

                <Separator />

                {/* ── Market Projection ── */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Rocket className="h-3.5 w-3.5" /> Market Projection
                  </h3>
                  {(() => {
                    const target = animal.marketWeightKg ?? 500;
                    const current = animal.weightKg ?? 0;
                    const pct = Math.min(100, Math.max(0, (current / target) * 100));
                    return (
                      <div className="rounded-lg border bg-gradient-to-br from-muted/40 to-transparent p-4 space-y-4">
                        {/* Progress toward target weight */}
                        <div>
                          <div className="flex items-end justify-between mb-1.5">
                            <span className="text-sm font-medium flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5 text-muted-foreground" />
                              {current} / {target} kg
                            </span>
                            <span className="text-xs text-muted-foreground">{pct.toFixed(0)}% to market</span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${animal.marketReady ? "bg-emerald-500" : "bg-primary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {animal.marketReady ? (
                          <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-2.5 text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            Ready for market — at or above {target} kg.
                          </div>
                        ) : animal.projectedMarketDate && animal.daysToMarket != null ? (
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Projected sale</p>
                              <p className="font-semibold text-sm">{format(parseISO(animal.projectedMarketDate), "dd MMM yyyy")}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Time to market</p>
                              <p className="font-semibold text-sm">
                                {animal.daysToMarket >= 30
                                  ? `~${Math.round(animal.daysToMarket / 30)} mo`
                                  : `${animal.daysToMarket} d`}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Daily gain</p>
                              <p className="font-semibold text-sm flex items-center justify-center gap-1">
                                <TrendingUp className="h-3 w-3 text-primary" />
                                {animal.avgDailyGainKg?.toFixed(2)} kg
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {(animal.weightRecordCount ?? 0) < 2
                              ? "Record at least two weigh-ins to project a market-ready date."
                              : "No upward weight trend yet — projection unavailable."}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </section>

                <Separator />

                {/* ── Weight History ── */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5" /> Weight History
                    </h3>
                    {isAdmin && (
                      <Button size="sm" variant="outline" onClick={() => setWeightOpen(true)}>
                        + Record
                      </Button>
                    )}
                  </div>
                  {weightRecords && weightRecords.length > 0 ? (
                    <div className="space-y-4">
                      {weightRecords.length >= 2 && (
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} tickFormatter={(v) => `${v}kg`} />
                            <Tooltip
                              formatter={(value: number) => [`${value} kg`, "Weight"]}
                              contentStyle={{
                                background: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "0.5rem",
                                fontSize: "0.75rem",
                              }}
                            />
                            <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2}
                              dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Weight</TableHead>
                            <TableHead>Change</TableHead>
                            {isAdmin && <TableHead className="w-8" />}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...weightRecords].reverse().map((r, idx, arr) => {
                            const prev = arr[idx + 1];
                            const change = prev ? r.weightKg - prev.weightKg : null;
                            return (
                              <TableRow key={r.id}>
                                <TableCell className="text-sm">{format(parseISO(r.recordedAt), "dd MMM yyyy")}</TableCell>
                                <TableCell className="font-semibold">{r.weightKg} kg</TableCell>
                                <TableCell>
                                  {change !== null ? (
                                    <span className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? "text-primary" : "text-destructive"}`}>
                                      {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                      {change >= 0 ? "+" : ""}{change.toFixed(1)} kg
                                    </span>
                                  ) : <span className="text-muted-foreground text-sm">—</span>}
                                </TableCell>
                                {isAdmin && (
                                  <TableCell>
                                    <Button
                                      variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      onClick={() => { if (confirm("Delete this entry?")) deleteWeightMutation.mutate({ id, weightId: r.id }); }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No weight records yet.</p>
                  )}
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {animal && (
        <>
          <AnimalFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            animal={animal as Parameters<typeof AnimalFormDialog>[0]["animal"]}
          />
          <TreatmentFormDialog open={treatmentOpen} onOpenChange={setTreatmentOpen} prefillCattleId={id} />
          <WeightFormDialog open={weightOpen} onOpenChange={setWeightOpen} cattleId={id} />
        </>
      )}
    </>
  );
}
