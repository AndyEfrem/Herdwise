import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateTreatment,
  useListCattle,
  getListTreatmentsQueryKey,
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

const TREATMENT_TYPES = [
  "3in1",
  "Dose",
  "Dip",
  "Isd",
  "FMD Vaccination",
  "Antibiotic Treatment",
  "Vitamin Supplement",
  "Hoof Trimming",
  "Health Check",
  "Other",
];

const formSchema = z.object({
  cattleId: z.string().min(1, "Animal is required"),
  treatmentType: z.string().min(1, "Treatment type is required"),
  scheduledDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TreatmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillCattleId?: number;
}

export function TreatmentFormDialog({ open, onOpenChange, prefillCattleId }: TreatmentFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cattle } = useListCattle();

  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cattleId: prefillCattleId ? String(prefillCattleId) : "",
      treatmentType: "",
      scheduledDate: today,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        cattleId: prefillCattleId ? String(prefillCattleId) : "",
        treatmentType: "",
        scheduledDate: today,
        notes: "",
      });
    }
  }, [open, prefillCattleId]);

  const createMutation = useCreateTreatment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Treatment recorded", description: "Treatment schedule saved." });
        queryClient.invalidateQueries({ queryKey: getListTreatmentsQueryKey() });
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: "Failed to record treatment", variant: "destructive" });
      },
    },
  });

  function onSubmit(values: FormValues) {
    createMutation.mutate({
      data: {
        cattleId: parseInt(values.cattleId, 10),
        treatmentType: values.treatmentType,
        scheduledDate: values.scheduledDate,
        notes: values.notes || null,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Record Treatment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cattleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Animal</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-treatment-cattle">
                        <SelectValue placeholder="Select animal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cattle?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.tag} — {c.breed}
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
              name="treatmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treatment Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-treatment-type">
                        <SelectValue placeholder="Select treatment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TREATMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Date</FormLabel>
                  <FormControl>
                    <Input type="date" data-testid="input-treatment-date" {...field} />
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
                    <Textarea
                      placeholder="Optional notes..."
                      className="resize-none"
                      rows={3}
                      data-testid="textarea-treatment-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-treatment">
                {createMutation.isPending ? "Saving..." : "Record Treatment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
