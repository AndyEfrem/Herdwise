import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAddWeightRecord, getListWeightRecordsQueryKey, getGetAnimalQueryKey, getListCattleQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  weightKg: z.string().min(1, "Weight is required"),
  recordedAt: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  recordedBy: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface WeightFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cattleId: number;
}

export function WeightFormDialog({ open, onOpenChange, cattleId }: WeightFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { weightKg: "", recordedAt: today, notes: "", recordedBy: "" },
  });

  useEffect(() => {
    if (open) form.reset({ weightKg: "", recordedAt: today, notes: "", recordedBy: "" });
  }, [open]);

  const mutation = useAddWeightRecord({
    mutation: {
      onSuccess: () => {
        toast({ title: "Weight recorded", description: "Weight entry saved successfully." });
        queryClient.invalidateQueries({ queryKey: getListWeightRecordsQueryKey(cattleId) });
        queryClient.invalidateQueries({ queryKey: getGetAnimalQueryKey(cattleId) });
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        onOpenChange(false);
      },
      onError: () => toast({ title: "Failed to record weight", variant: "destructive" }),
    },
  });

  function onSubmit(values: FormValues) {
    mutation.mutate({
      id: cattleId,
      data: {
        weightKg: parseFloat(values.weightKg),
        recordedAt: values.recordedAt,
        notes: values.notes || null,
        recordedBy: values.recordedBy || null,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Record Weight</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="e.g. 485.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recordedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="recordedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recorded By</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Thabo Mokoena" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Optional notes..." className="resize-none" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Record Weight"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
