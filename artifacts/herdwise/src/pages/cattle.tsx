import { useState } from "react";
import { Link } from "wouter";
import {
  useListCattle,
  useDeleteAnimal,
  getListCattleQueryKey,
} from "@workspace/api-client-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, Box, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AnimalFormDialog } from "@/components/animal-form-dialog";
import { useUserRole } from "@/hooks/use-user-role";

type Animal = {
  id: number;
  tag: string;
  previousTag?: string | null;
  breed: string;
  sex?: string | null;
  stage?: string | null;
  description?: string | null;
  status: string;
  weightKg: number | null;
  dateReceived?: string | null;
  investorId: number | null;
  investorName: string | null;
  notes: string | null;
  createdAt: string;
};

const SEX_LABEL: Record<string, string> = { male: "M", female: "F" };

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  quarantined: "destructive",
  sold: "secondary",
  deceased: "secondary",
};

export function CattleList() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editAnimal, setEditAnimal] = useState<Animal | null>(null);
  const { data: cattle, isLoading } = useListCattle();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();

  const deleteMutation = useDeleteAnimal({
    mutation: {
      onSuccess: () => {
        toast({ title: "Animal removed", description: "The record has been deleted." });
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  const filteredCattle = cattle?.filter((c) =>
    c.tag.toLowerCase().includes(search.toLowerCase()) ||
    c.breed.toLowerCase().includes(search.toLowerCase()) ||
    (c.investorName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Cattle</h1>
          <p className="text-muted-foreground mt-1 text-sm">Herd inventory — stock receiving register.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)} data-testid="button-add-animal">
            <Plus className="h-4 w-4 mr-2" /> Register Stock
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by tag, breed or owner..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-cattle"
          />
        </div>
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Prev. Tag</TableHead>
              <TableHead>Breed</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Date Received</TableHead>
              {isAdmin && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredCattle && filteredCattle.length > 0 ? (
              filteredCattle.map((animal) => (
                <TableRow key={animal.id} data-testid={`row-cattle-${animal.id}`} className="group">
                  <TableCell className="font-medium">
                    <Link href={`/cattle/${animal.id}`} className="hover:text-primary transition-colors">
                      {animal.tag}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{animal.previousTag || "—"}</TableCell>
                  <TableCell>{animal.breed}</TableCell>
                  <TableCell className="text-sm">
                    {animal.sex ? <Badge variant="outline">{SEX_LABEL[animal.sex] ?? animal.sex}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{animal.stage || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusColor[animal.status] ?? "outline"}>{animal.status}</Badge>
                  </TableCell>
                  <TableCell>{animal.weightKg != null ? `${animal.weightKg} kg` : "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{animal.investorName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {animal.dateReceived ? format(parseISO(animal.dateReceived), "dd/MM/yyyy") : "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-actions-${animal.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditAnimal(animal as Animal)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => { if (confirm(`Delete ${animal.tag}? This cannot be undone.`)) deleteMutation.mutate({ id: animal.id }); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Box className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm font-medium">No cattle found</p>
                    <p className="text-xs mt-1">{isAdmin ? "Register your first animal to get started." : "No animals assigned to your account."}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AnimalFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <AnimalFormDialog
        open={!!editAnimal}
        onOpenChange={(open) => { if (!open) setEditAnimal(null); }}
        animal={editAnimal}
      />
    </div>
  );
}
