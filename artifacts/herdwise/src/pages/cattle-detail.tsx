import { useParams, Link, useLocation } from "wouter";
import {
  useGetAnimal,
  useListTreatments,
  useDeleteAnimal,
  getGetAnimalQueryKey,
  getListCattleQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Activity, Scale, Info, Users, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function CattleDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const animalId = parseInt(id || "0", 10);

  const { data: animal, isLoading } = useGetAnimal(animalId, {
    query: { enabled: !!animalId, queryKey: getGetAnimalQueryKey(animalId) },
  });

  const { data: treatments, isLoading: isTreatmentsLoading } = useListTreatments(
    { cattleId: animalId },
    { query: { enabled: !!animalId } }
  );

  const deleteMutation = useDeleteAnimal({
    mutation: {
      onSuccess: () => {
        toast({ title: "Animal deleted", description: "The record has been removed." });
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        setLocation("/cattle");
      },
      onError: (error: any) => {
        toast({
          title: "Failed to delete",
          description: error.message || "An error occurred",
          variant: "destructive",
        });
      },
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this animal?")) {
      deleteMutation.mutate({ id: animalId });
    }
  };

  if (isLoading || !animal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/cattle">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{animal.tag}</h1>
              <Badge variant={animal.status === "active" ? "default" : "secondary"}>
                {animal.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{animal.breed}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-muted-foreground" />
              Animal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Scale className="h-3 w-3" /> Weight
                </p>
                <p className="text-lg font-medium">
                  {animal.weightKg ? `${animal.weightKg} kg` : "Not recorded"}
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

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Users className="h-3 w-3" /> Assigned Investor
              </p>
              {animal.investorId ? (
                <Link href={`/investors/${animal.investorId}`} className="text-primary font-medium hover:underline">
                  {animal.investorName || `Investor #${animal.investorId}`}
                </Link>
              ) : (
                <p className="text-sm">Unassigned</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
              <div className="text-sm bg-muted/50 p-3 rounded-md min-h-[80px]">
                {animal.notes || <span className="text-muted-foreground italic">No notes recorded</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Treatment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isTreatmentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : treatments && treatments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treatments.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.treatmentType}</TableCell>
                      <TableCell>{format(parseISO(t.scheduledDate), "MMM d")}</TableCell>
                      <TableCell>
                        <Badge variant={t.completed ? "secondary" : "default"}>
                          {t.completed ? "Done" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No treatments recorded for this animal.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
