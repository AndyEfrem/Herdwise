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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Box, MoreHorizontal, Pencil, Trash2, ArrowUpDown, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AnimalFormDialog } from "@/components/animal-form-dialog";
import { CattleDetailSheet } from "@/components/cattle-detail-sheet";
import { useUserRole } from "@/hooks/use-user-role";

type Animal = {
  id: number;
  tag: string;
  previousTag?: string | null;
  lotNumber?: string | null;
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
  marketWeightKg?: number;
  marketReady?: boolean;
  weightRecordCount?: number;
  avgDailyGainKg?: number | null;
  daysToMarket?: number | null;
  projectedMarketDate?: string | null;
};

type SortKey = "default" | "closest" | "heaviest" | "soonest";

const SEX_LABEL: Record<string, string> = { male: "M", female: "F" };

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  quarantined: "destructive",
  sold: "secondary",
  deceased: "secondary",
};

export function CattleList() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [addOpen, setAddOpen] = useState(false);
  const [editAnimal, setEditAnimal] = useState<Animal | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
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

  const filteredCattle = cattle
    ?.filter((c) =>
      c.tag.toLowerCase().includes(search.toLowerCase()) ||
      c.breed.toLowerCase().includes(search.toLowerCase()) ||
      (c.investorName ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .slice()
    .sort((a, b) => {
      switch (sortKey) {
        case "heaviest":
          return (b.weightKg ?? -Infinity) - (a.weightKg ?? -Infinity);
        case "closest": {
          // Highest % toward target first; ready animals on top.
          const ap = (a.weightKg ?? 0) / (a.marketWeightKg ?? 500);
          const bp = (b.weightKg ?? 0) / (b.marketWeightKg ?? 500);
          return bp - ap;
        }
        case "soonest": {
          // Soonest projected sale first; ready (0) before later dates,
          // animals with no projection sink to the bottom.
          const ad = a.marketReady ? 0 : a.daysToMarket ?? Infinity;
          const bd = b.marketReady ? 0 : b.daysToMarket ?? Infinity;
          return ad - bd;
        }
        default:
          return 0; // preserve API order (date received)
      }
    });

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

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 max-w-md">
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
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-[220px]" data-testid="select-sort-cattle">
            <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Date received</SelectItem>
            <SelectItem value="closest">Closest to market</SelectItem>
            <SelectItem value="soonest">Soonest projected sale</SelectItem>
            <SelectItem value="heaviest">Heaviest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Prev. Tag</TableHead>
              <TableHead>Lot No.</TableHead>
              <TableHead>Breed</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead className="min-w-[160px]">Market Readiness</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Date Received</TableHead>
              {isAdmin && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 11 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredCattle && filteredCattle.length > 0 ? (
              filteredCattle.map((animal) => (
                <TableRow key={animal.id} data-testid={`row-cattle-${animal.id}`} className="group">
                  <TableCell className="font-medium">
                    <button
                      onClick={() => setSelectedId(animal.id)}
                      className="hover:text-primary transition-colors underline-offset-2 hover:underline text-left"
                    >
                      {animal.tag}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{animal.previousTag || "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{animal.lotNumber ? <Badge variant="outline" className="font-mono text-xs">Lot {animal.lotNumber}</Badge> : <span className="text-muted-foreground text-xs">Private</span>}</TableCell>
                  <TableCell>{animal.breed}</TableCell>
                  <TableCell className="text-sm">
                    {animal.sex ? <Badge variant="outline">{SEX_LABEL[animal.sex] ?? animal.sex}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{animal.stage || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusColor[animal.status] ?? "outline"}>{animal.status}</Badge>
                  </TableCell>
                  <TableCell>{animal.weightKg != null ? `${animal.weightKg} kg` : "—"}</TableCell>
                  <TableCell><MarketCell animal={animal} /></TableCell>
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
                <TableCell colSpan={11} className="h-32 text-center">
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
      <CattleDetailSheet animalId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

type MarketCellAnimal = Pick<
  Animal,
  "weightKg" | "marketWeightKg" | "marketReady" | "weightRecordCount" | "daysToMarket" | "projectedMarketDate"
>;

function MarketCell({ animal }: { animal: MarketCellAnimal }) {
  const target = animal.marketWeightKg ?? 500;
  const current = animal.weightKg ?? 0;
  const pct = Math.min(100, Math.max(0, (current / target) * 100));

  let label: React.ReactNode;
  if (animal.marketReady) {
    label = (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Ready for market
      </span>
    );
  } else if (animal.projectedMarketDate && animal.daysToMarket != null) {
    label = (
      <span className="text-xs text-muted-foreground">
        {animal.daysToMarket >= 30
          ? `~${Math.round(animal.daysToMarket / 30)} mo`
          : `${animal.daysToMarket} d`}
        {" · "}
        {format(parseISO(animal.projectedMarketDate), "dd MMM yyyy")}
      </span>
    );
  } else {
    label = (
      <span className="text-xs text-muted-foreground/70">
        {(animal.weightRecordCount ?? 0) < 2 ? "Needs weigh-ins" : "No trend"}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tabular-nums">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${animal.marketReady ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label}
    </div>
  );
}
