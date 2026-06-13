import { useState } from "react";
import { Link } from "wouter";
import {
  useListInvestors,
  useDeleteInvestor,
  useInviteInvestor,
  getListInvestorsQueryKey,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  Mail,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { InvestorFormDialog } from "@/components/investor-form-dialog";

type Investor = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  cattleCount: number;
  createdAt: string;
  clerkUserId?: string | null;
};

export function InvestorsList() {
  const [addOpen, setAddOpen] = useState(false);
  const [editInvestor, setEditInvestor] = useState<Investor | null>(null);

  const { data: investors, isLoading } = useListInvestors();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useDeleteInvestor({
    mutation: {
      onSuccess: () => {
        toast({ title: "Investor removed" });

        queryClient.invalidateQueries({
          queryKey: getListInvestorsQueryKey(),
        });
      },

      onError: () => {
        toast({
          title: "Failed to delete investor",
          variant: "destructive",
        });
      },
    },
  });

  const inviteMutation = useInviteInvestor({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Invitation sent",
          description:
            "The investor has been emailed a portal invitation.",
        });

        queryClient.invalidateQueries({
          queryKey: getListInvestorsQueryKey(),
        });
      },

      onError: () => {
        toast({
          title: "Failed to send invitation",
          variant: "destructive",
        });
      },
    },
  });

  const handleDelete = (investor: Investor) => {
    if (
      confirm(
        `Remove ${investor.name}? This cannot be undone.`,
      )
    ) {
      deleteMutation.mutate({
        id: investor.id,
      });
    }
  };

  const handleInvite = (investor: Investor) => {
    if (!investor.email) {
      toast({
        title: "Missing email address",
        description:
          "Add an email address before sending an invitation.",
        variant: "destructive",
      });

      return;
    }

    inviteMutation.mutate({
      id: investor.id,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Investors
          </h1>

          <p className="text-muted-foreground mt-1 text-sm">
            Manage your partners and stakeholders.
          </p>
        </div>

        <Button
          onClick={() => setAddOpen(true)}
          data-testid="button-add-investor"
        >
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
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                Cattle Owned
              </TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : investors && investors.length > 0 ? (
              investors.map((investor) => {
                const isLinked =
                  (investor as Investor).clerkUserId != null;

                return (
                  <TableRow
                    key={investor.id}
                    data-testid={`row-investor-${investor.id}`}
                    className="group"
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/investors/${investor.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {investor.name}
                      </Link>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm">
                        <div>{investor.email || "—"}</div>

                        <div className="text-xs text-muted-foreground">
                          {investor.phone || ""}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {isLinked ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-700 px-2 py-1 text-xs font-medium">
                          Pending Setup
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-medium">
                      {investor.cattleCount ?? 0}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {format(
                        parseISO(investor.createdAt),
                        "MMM d, yyyy"
                      )}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-actions-investor-${investor.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          {!isLinked && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleInvite(
                                    investor as Investor
                                  )
                                }
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Send Invitation
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                            </>
                          )}

                          <DropdownMenuItem
                            onClick={() =>
                              setEditInvestor(
                                investor as Investor
                              )
                            }
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              handleDelete(
                                investor as Investor
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Users className="h-8 w-8 mb-2 opacity-20" />

                    <p className="text-sm font-medium">
                      No investors yet
                    </p>

                    <p className="text-xs mt-1">
                      Add your first investor to get started.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <InvestorFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <InvestorFormDialog
        open={!!editInvestor}
        onOpenChange={(open) => {
          if (!open) setEditInvestor(null);
        }}
        investor={editInvestor}
      />
    </div>
  );
}