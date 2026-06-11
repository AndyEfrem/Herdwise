import { useParams, Link, useLocation } from "wouter";
import {
  useGetInvestor,
  useListCattle,
  useDeleteInvestor,
  getGetInvestorQueryKey,
  getListInvestorsQueryKey,
  getListCattleQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash2, Box, Mail, Phone, Calendar } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

export function InvestorDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const investorId = parseInt(id || "0", 10);

  const { data: investor, isLoading } = useGetInvestor(investorId, {
    query: { enabled: !!investorId, queryKey: getGetInvestorQueryKey(investorId) },
  });

  const { data: cattle, isLoading: isCattleLoading } = useListCattle(
    { investorId },
    { query: { enabled: !!investorId, queryKey: getListCattleQueryKey({ investorId }) } }
  );

  const deleteMutation = useDeleteInvestor({
    mutation: {
      onSuccess: () => {
        toast({ title: "Investor deleted", description: "The record has been removed." });
        queryClient.invalidateQueries({ queryKey: getListInvestorsQueryKey() });
        setLocation("/investors");
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
    if (confirm("Are you sure you want to delete this investor?")) {
      deleteMutation.mutate({ id: investorId });
    }
  };

  if (isLoading || !investor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-48 w-full md:col-span-1" />
          <Skeleton className="h-64 w-full md:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/investors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{investor.name}</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
              <Box className="h-4 w-4" /> {investor.cattleCount || 0} animals owned
            </p>
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

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <Mail className="h-3 w-3" /> Email
              </p>
              <p className="text-sm font-medium">
                {investor.email || <span className="text-muted-foreground italic">No email</span>}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <Phone className="h-3 w-3" /> Phone
              </p>
              <p className="text-sm font-medium">
                {investor.phone || <span className="text-muted-foreground italic">No phone</span>}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Partner Since
              </p>
              <p className="text-sm font-medium">
                {format(parseISO(investor.createdAt), "MMMM d, yyyy")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Owned Cattle</CardTitle>
          </CardHeader>
          <CardContent>
            {isCattleLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : cattle && cattle.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag</TableHead>
                      <TableHead>Breed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cattle.map((animal) => (
                      <TableRow key={animal.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">
                          <Link href={`/cattle/${animal.id}`} className="text-primary hover:underline">
                            {animal.tag}
                          </Link>
                        </TableCell>
                        <TableCell>{animal.breed}</TableCell>
                        <TableCell>
                          <Badge variant={animal.status === "active" ? "default" : "secondary"}>
                            {animal.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(parseISO(animal.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10 border rounded-md border-dashed text-muted-foreground text-sm flex flex-col items-center">
                <Box className="h-8 w-8 mb-2 opacity-20" />
                <p>This investor currently owns no cattle.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
