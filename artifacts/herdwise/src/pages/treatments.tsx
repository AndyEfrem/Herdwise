import { Link } from "wouter";
import {
  useListTreatments,
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
import { Plus, Stethoscope } from "lucide-react";
import { format, parseISO } from "date-fns";

export function TreatmentsList() {
  const { data: treatments, isLoading } = useListTreatments();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Treatments</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Medical history and upcoming care.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Record Treatment
        </Button>
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Animal Tag</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                </TableRow>
              ))
            ) : treatments && treatments.length > 0 ? (
              treatments.map((treatment) => (
                <TableRow key={treatment.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">
                    <Link href={`/cattle/${treatment.cattleId}`} className="text-primary hover:underline">
                      {treatment.cattleTag || `#${treatment.cattleId}`}
                    </Link>
                  </TableCell>
                  <TableCell>{treatment.treatmentType}</TableCell>
                  <TableCell>
                    {format(parseISO(treatment.scheduledDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={treatment.completed ? "secondary" : "default"}>
                      {treatment.completed ? "Completed" : "Upcoming"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Stethoscope className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm font-medium">No treatments recorded</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
