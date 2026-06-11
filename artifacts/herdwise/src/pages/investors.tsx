import { useState } from "react";
import { Link } from "wouter";
import {
  useListInvestors,
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
import { Plus, Users } from "lucide-react";
import { format, parseISO } from "date-fns";

export function InvestorsList() {
  const { data: investors, isLoading } = useListInvestors();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Investors</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your partners and stakeholders.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Investor
        </Button>
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Cattle Owned</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                </TableRow>
              ))
            ) : investors && investors.length > 0 ? (
              investors.map((investor) => (
                <TableRow key={investor.id} className="cursor-pointer hover:bg-muted/50 transition-colors group">
                  <TableCell className="font-medium">
                    <Link href={`/investors/${investor.id}`} className="block">
                      {investor.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{investor.email || "—"}</div>
                      <div className="text-xs text-muted-foreground">{investor.phone || ""}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{investor.cattleCount || 0}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(parseISO(investor.createdAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Users className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm font-medium">No investors found</p>
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
