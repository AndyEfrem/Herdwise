import { useState } from "react";
import { Link } from "wouter";
import {
  useListCattle,
} from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Box } from "lucide-react";
import { format, parseISO } from "date-fns";

export function CattleList() {
  const [search, setSearch] = useState("");
  const { data: cattle, isLoading } = useListCattle();

  const filteredCattle = cattle?.filter((c) =>
    c.tag.toLowerCase().includes(search.toLowerCase()) ||
    c.breed.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Cattle</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your herd inventory.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Animal
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by tag or breed..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Breed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                </TableRow>
              ))
            ) : filteredCattle && filteredCattle.length > 0 ? (
              filteredCattle.map((animal) => (
                <TableRow key={animal.id} className="cursor-pointer hover:bg-muted/50 transition-colors group">
                  <TableCell className="font-medium">
                    <Link href={`/cattle/${animal.id}`} className="flex items-center gap-2">
                      {animal.tag}
                    </Link>
                  </TableCell>
                  <TableCell>{animal.breed}</TableCell>
                  <TableCell>
                    <Badge variant={animal.status === "active" ? "default" : "secondary"}>
                      {animal.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{animal.weightKg ? `${animal.weightKg} kg` : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(parseISO(animal.createdAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Box className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm font-medium">No cattle found</p>
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
