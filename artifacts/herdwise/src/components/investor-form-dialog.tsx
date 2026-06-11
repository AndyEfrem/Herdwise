import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateInvestor,
  useUpdateInvestor,
  getListInvestorsQueryKey,
  getGetInvestorQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Investor = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
};

interface InvestorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investor?: Investor | null;
}

export function InvestorFormDialog({ open, onOpenChange, investor }: InvestorFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!investor;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  useEffect(() => {
    if (open) {
      if (investor) {
        form.reset({
          name: investor.name,
          email: investor.email ?? "",
          phone: investor.phone ?? "",
        });
      } else {
        form.reset({ name: "", email: "", phone: "" });
      }
    }
  }, [open, investor]);

  const createMutation = useCreateInvestor({
    mutation: {
      onSuccess: () => {
        toast({ title: "Investor added", description: "New investor registered successfully." });
        queryClient.invalidateQueries({ queryKey: getListInvestorsQueryKey() });
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: "Failed to add investor", variant: "destructive" });
      },
    },
  });

  const updateMutation = useUpdateInvestor({
    mutation: {
      onSuccess: () => {
        toast({ title: "Investor updated", description: "Changes saved successfully." });
        queryClient.invalidateQueries({ queryKey: getListInvestorsQueryKey() });
        if (investor) queryClient.invalidateQueries({ queryKey: getGetInvestorQueryKey(investor.id) });
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: "Failed to update investor", variant: "destructive" });
      },
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
    };

    if (isEdit && investor) {
      updateMutation.mutate({ id: investor.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Investor" : "Add Investor"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. James Khumalo" data-testid="input-investor-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="investor@example.com"
                      data-testid="input-investor-email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+27 82 000 0000" data-testid="input-investor-phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-investor">
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Investor"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
