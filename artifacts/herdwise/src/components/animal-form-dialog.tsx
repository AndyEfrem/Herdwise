import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateAnimal,
  useUpdateAnimal,
  useListInvestors,
  getListCattleQueryKey,
  getGetAnimalQueryKey,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  tag: z.string().min(1, "Tag is required"),
  breed: z.string().min(1, "Breed is required"),
  status: z.string().min(1, "Status is required"),
  weightKg: z.string().optional(),
  investorId: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Animal = {
  id: number;
  tag: string;
  breed: string;
  status: string;
  weightKg?: number | null;
  investorId?: number | null;
  notes?: string | null;
};

interface AnimalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animal?: Animal | null;
}

export function AnimalFormDialog({ open, onOpenChange, animal }: AnimalFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!animal;

  const { data: investors } = useListInvestors();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tag: "",
      breed: "",
      status: "active",
      weightKg: "",
      investorId: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (animal) {
        form.reset({
          tag: animal.tag,
          breed: animal.breed,
          status: animal.status,
          weightKg: animal.weightKg != null ? String(animal.weightKg) : "",
          investorId: animal.investorId != null ? String(animal.investorId) : "none",
          notes: animal.notes ?? "",
        });
      } else {
        form.reset({
          tag: "",
          breed: "",
          status: "active",
          weightKg: "",
          investorId: "none",
          notes: "",
        });
      }
    }
  }, [open, animal]);

  const createMutation = useCreateAnimal({
    mutation: {
      onSuccess: () => {
        toast({ title: "Animal added", description: "New animal registered successfully." });
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: "Failed to add animal", variant: "destructive" });
      },
    },
  });

  const updateMutation = useUpdateAnimal({
    mutation: {
      onSuccess: () => {
        toast({ title: "Animal updated", description: "Changes saved successfully." });
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        if (animal) queryClient.invalidateQueries({ queryKey: getGetAnimalQueryKey(animal.id) });
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: "Failed to update animal", variant: "destructive" });
      },
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: FormValues) {
    const payload = {
      tag: values.tag,
      breed: values.breed,
      status: values.status,
      weightKg: values.weightKg ? parseFloat(values.weightKg) : null,
      investorId: values.investorId && values.investorId !== "none" ? parseInt(values.investorId, 10) : null,
      notes: values.notes || null,
    };

    if (isEdit && animal) {
      updateMutation.mutate({ id: animal.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Animal" : "Add Animal"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. HW-009" data-testid="input-tag" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breed</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Angus" data-testid="input-breed" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="quarantined">Quarantined</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="deceased">Deceased</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 480.5"
                        data-testid="input-weight"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="investorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Investor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-investor">
                        <SelectValue placeholder="None (unassigned)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None (unassigned)</SelectItem>
                      {investors?.map((inv) => (
                        <SelectItem key={inv.id} value={String(inv.id)}>
                          {inv.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes about this animal..."
                      className="resize-none"
                      rows={3}
                      data-testid="textarea-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-animal">
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Animal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
