import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetInvestor,
  useListCattle,
  useDeleteInvestor,
  useUpdateInvestor,
  getGetInvestorQueryKey,
  getListInvestorsQueryKey,
  getListCattleQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Edit, Trash2, Box, Mail, Phone, Calendar, Link2, Link2Off, ShieldCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/use-user-role";
import { InvestorFormDialog } from "@/components/investor-form-dialog";

export function InvestorDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const investorId = parseInt(id || "0", 10);

  const [editOpen, setEditOpen] = useState(false);
  const [clerkIdInput, setClerkIdInput] = useState("");
  const [linkingMode, setLinkingMode] = useState(false);

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
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  const linkMutation = useUpdateInvestor({
    mutation: {
      onSuccess: () => {
        toast({ title: "Account linked", description: "Investor can now sign in with their Clerk account." });
        queryClient.invalidateQueries({ queryKey: getGetInvestorQueryKey(investorId) });
        queryClient.invalidateQueries({ queryKey: getListInvestorsQueryKey() });
        setLinkingMode(false);
        setClerkIdInput("");
      },
      onError: () => toast({ title: "Failed to link account", variant: "destructive" }),
    },
  });

  const unlinkMutation = useUpdateInvestor({
    mutation: {
      onSuccess: () => {
        toast({ title: "Account unlinked" });
        queryClient.invalidateQueries({ queryKey: getGetInvestorQueryKey(investorId) });
        queryClient.invalidateQueries({ queryKey: getListInvestorsQueryKey() });
      },
      onError: () => toast({ title: "Failed to unlink", variant: "destructive" }),
    },
  });

  if (isLoading || !investor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-32" /></div>
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
            <Link href="/investors"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{investor.name}</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
              <Box className="h-4 w-4" /> {investor.cattleCount || 0} animals owned
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => { if (confirm("Are you sure you want to delete this investor?")) deleteMutation.mutate({ id: investorId }); }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          <Card>
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
                <p className="text-sm font-medium">{format(parseISO(investor.createdAt), "MMMM d, yyyy")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Portal access card — admin only */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-muted-foreground" /> Portal Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {investor.clerkUserId ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-primary font-medium">
                      <Link2 className="h-4 w-4" /> Account linked
                    </div>
                    <p className="text-xs text-muted-foreground break-all font-mono bg-muted p-2 rounded">
                      {investor.clerkUserId}
                    </p>
                    <Button
                      size="sm" variant="outline" className="w-full text-destructive hover:text-destructive"
                      disabled={unlinkMutation.isPending}
                      onClick={() => { if (confirm("Remove portal access for this investor?")) unlinkMutation.mutate({ id: investorId, data: { clerkUserId: null } }); }}
                    >
                      <Link2Off className="h-4 w-4 mr-2" /> Remove access
                    </Button>
                  </>
                ) : linkingMode ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Paste the investor's Clerk User ID (starts with <code>user_</code>)</p>
                    <Input
                      placeholder="user_2abc..."
                      value={clerkIdInput}
                      onChange={(e) => setClerkIdInput(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm" className="flex-1"
                        disabled={!clerkIdInput.startsWith("user_") || linkMutation.isPending}
                        onClick={() => linkMutation.mutate({ id: investorId, data: { clerkUserId: clerkIdInput.trim() } })}
                      >
                        {linkMutation.isPending ? "Linking..." : "Link account"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setLinkingMode(false); setClerkIdInput(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">No portal access yet. Link a Clerk account so this investor can sign in and view their cattle.</p>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setLinkingMode(true)}>
                      <Link2 className="h-4 w-4 mr-2" /> Grant portal access
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Owned Cattle</CardTitle>
          </CardHeader>
          <CardContent>
            {isCattleLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : cattle && cattle.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag</TableHead>
                      <TableHead>Breed</TableHead>
                      <TableHead>Weight</TableHead>
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
                        <TableCell>{animal.weightKg != null ? `${animal.weightKg} kg` : "—"}</TableCell>
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

      <InvestorFormDialog open={editOpen} onOpenChange={setEditOpen} investor={investor as Parameters<typeof InvestorFormDialog>[0]["investor"]} />
    </div>
  );
}
