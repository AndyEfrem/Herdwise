import { useState } from "react";
import { Link } from "wouter";
import {
  useListTreatments,
  useUpdateTreatment,
  useDeleteTreatment,
  getListTreatmentsQueryKey,
} from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Stethoscope, MoreHorizontal, CheckCircle2, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { TreatmentFormDialog } from "@/components/treatment-form-dialog";

export function TreatmentsList() {
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = filter === "upcoming" ? { upcoming: true } : {};
  const { data: treatments, isLoading } = useListTreatments(params, {
    query: { queryKey: getListTreatmentsQueryKey(params) },
  });

  const filteredTreatments = filter === "completed"
    ? treatments?.filter((t) => t.completed)
    : treatments;

  const markCompleteMutation = useUpdateTreatment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Treatment marked complete" });
        queryClient.invalidateQueries({ queryKey: getListTreatmentsQueryKey(params) });
        queryClient.invalidateQueries({ queryKey: getListTreatmentsQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to update", variant: "destructive" });
      },
    },
  });

  const deleteMutation = useDeleteTreatment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Treatment deleted" });
        queryClient.invalidateQueries({ queryKey: getListTreatmentsQueryKey(params) });
        queryClient.invalidateQueries({ queryKey: getListTreatmentsQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to delete", variant: "destructive" });
      },
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Delete this treatment record?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Treatments</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Medical history and upcoming care.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} data-testid="button-record-treatment">
          <Plus className="h-4 w-4 mr-2" />
          Record Treatment
        </Button>
      </div>

      <div className="flex gap-2">
        {(["all", "upcoming", "completed"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
            data-testid={`button-filter-${f}`}
          >
            {f}
          </Button>
        ))}
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Animal</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredTreatments && filteredTreatments.length > 0 ? (
              filteredTreatments.map((treatment) => (
                <TableRow key={treatment.id} data-testid={`row-treatment-${treatment.id}`} className="group">
                  <TableCell className="font-medium">
                    <Link href={`/cattle/${treatment.cattleId}`} className="text-primary hover:underline">
                      {treatment.cattleTag || `#${treatment.cattleId}`}
                    </Link>
                  </TableCell>
                  <TableCell>{treatment.treatmentType}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(parseISO(treatment.scheduledDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={treatment.completed ? "secondary" : "default"}>
                      {treatment.completed ? "Completed" : "Upcoming"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-actions-treatment-${treatment.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!treatment.completed && (
                          <>
                            <DropdownMenuItem
                              onClick={() => markCompleteMutation.mutate({ id: treatment.id, data: { completed: true } })}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Mark complete
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(treatment.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Stethoscope className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm font-medium">No treatments recorded</p>
                    <p className="text-xs mt-1">Schedule a treatment to get started.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TreatmentFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
