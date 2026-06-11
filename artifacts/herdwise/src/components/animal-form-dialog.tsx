import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateAnimal,
  useUpdateAnimal,
  useListInvestors,
  useCreateTreatment,
  getListCattleQueryKey,
  getGetAnimalQueryKey,
  getListTreatmentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const STAGE_OPTIONS = ["Calf", "Weaner", "Yearling", "Heifer", "Cow", "Bull", "Steer", "Ox"];

const formSchema = z.object({
  tag: z.string().min(1, "Tag is required"),
  previousTag: z.string().optional(),
  lotNumber: z.string().optional(),
  breed: z.string().min(1, "Breed is required"),
  sex: z.string().optional(),
  stage: z.string().optional(),
  description: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  weightKg: z.string().optional(),
  dateReceived: z.string().optional(),
  investorId: z.string().optional(),
  notes: z.string().optional(),
  arrival3in1: z.boolean().default(false),
  arrivalDosing: z.boolean().default(false),
  arrivalDipping: z.boolean().default(false),
  arrivalIsd: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

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
  weightKg?: number | null;
  dateReceived?: string | null;
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
  const today = new Date().toISOString().slice(0, 10);

  const { data: investors } = useListInvestors();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tag: "", previousTag: "", lotNumber: "", breed: "", sex: "none", stage: "none",
      description: "", status: "active", weightKg: "", dateReceived: today,
      investorId: "none", notes: "",
      arrival3in1: false, arrivalDosing: false, arrivalDipping: false, arrivalIsd: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (animal) {
        form.reset({
          tag: animal.tag, previousTag: animal.previousTag ?? "",
          lotNumber: animal.lotNumber ?? "",
          breed: animal.breed,
          sex: animal.sex ?? "none",
          stage: animal.stage ?? "none",
          description: animal.description ?? "",
          status: animal.status,
          weightKg: animal.weightKg != null ? String(animal.weightKg) : "",
          dateReceived: animal.dateReceived ?? today,
          investorId: animal.investorId != null ? String(animal.investorId) : "none",
          notes: animal.notes ?? "",
          arrival3in1: false, arrivalDosing: false, arrivalDipping: false, arrivalIsd: false,
        });
      } else {
        form.reset({
          tag: "", previousTag: "", lotNumber: "", breed: "", sex: "none", stage: "none",
          description: "", status: "active", weightKg: "", dateReceived: today,
          investorId: "none", notes: "",
          arrival3in1: false, arrivalDosing: false, arrivalDipping: false, arrivalIsd: false,
        });
      }
    }
  }, [open, animal]);

  const createTreatment = useCreateTreatment({ mutation: {} });

  const createMutation = useCreateAnimal({
    mutation: {
      onSuccess: async (created) => {
        const arrivalDate = form.getValues("dateReceived") || today;
        const tasks: Promise<unknown>[] = [];
        if (form.getValues("arrival3in1")) {
          tasks.push(createTreatment.mutateAsync({ data: { cattleId: created.id, treatmentType: "3in1", scheduledDate: arrivalDate, notes: "Arrival 3in1 vaccination" } }));
        }
        if (form.getValues("arrivalDosing")) {
          tasks.push(createTreatment.mutateAsync({ data: { cattleId: created.id, treatmentType: "Dose", scheduledDate: arrivalDate, notes: "Arrival dose" } }));
        }
        if (form.getValues("arrivalDipping")) {
          tasks.push(createTreatment.mutateAsync({ data: { cattleId: created.id, treatmentType: "Dip", scheduledDate: arrivalDate, notes: "Arrival dipping" } }));
        }
        if (form.getValues("arrivalIsd")) {
          tasks.push(createTreatment.mutateAsync({ data: { cattleId: created.id, treatmentType: "Isd", scheduledDate: arrivalDate, notes: "Arrival Isd" } }));
        }
        await Promise.allSettled(tasks);
        toast({ title: "Animal registered", description: "New stock entry saved successfully." });
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTreatmentsQueryKey() });
        onOpenChange(false);
      },
      onError: () => toast({ title: "Failed to add animal", variant: "destructive" }),
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
      onError: () => toast({ title: "Failed to update animal", variant: "destructive" }),
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: FormValues) {
    const payload = {
      tag: values.tag,
      previousTag: values.previousTag || null,
      lotNumber: values.lotNumber || null,
      breed: values.breed,
      sex: values.sex && values.sex !== "none" ? values.sex : null,
      stage: values.stage && values.stage !== "none" ? values.stage : null,
      description: values.description || null,
      status: values.status,
      weightKg: values.weightKg ? parseFloat(values.weightKg) : null,
      dateReceived: values.dateReceived || null,
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
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Animal" : "Register New Stock"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Tags + Lot */}
            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="tag" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. HW-009" data-testid="input-tag" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="previousTag" render={({ field }) => (
                <FormItem>
                  <FormLabel>Previous Tag</FormLabel>
                  <FormControl><Input placeholder="Old tag" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lotNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lot No.</FormLabel>
                  <FormControl><Input placeholder="e.g. 14A (auction)" {...field} /></FormControl>
                  <p className="text-[11px] text-muted-foreground mt-1">Leave blank for private sale</p>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Breed + Date Received */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="breed" render={({ field }) => (
                <FormItem>
                  <FormLabel>Breed <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. Angus" data-testid="input-breed" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dateReceived" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Received</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Sex + Stage */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="sex" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sex</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unknown</SelectItem>
                      <SelectItem value="female">Female (F)</SelectItem>
                      <SelectItem value="male">Male (M)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="stage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {STAGE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Description */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Light brown, horned, white patch on forehead" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Status + Weight */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status"><SelectValue placeholder="Select status" /></SelectTrigger>
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
              )} />
              <FormField control={form.control} name="weightKg" render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight In (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="e.g. 320" data-testid="input-weight" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Investor */}
            <FormField control={form.control} name="investorId" render={({ field }) => (
              <FormItem>
                <FormLabel>Owner (Investor)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-investor"><SelectValue placeholder="None (unassigned)" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None (unassigned)</SelectItem>
                    {investors?.map((inv) => (
                      <SelectItem key={inv.id} value={String(inv.id)}>{inv.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Notes */}
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any additional notes..." className="resize-none" rows={2} data-testid="textarea-notes" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Arrival Treatments — only on create */}
            {!isEdit && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-3">Arrival Treatments</p>
                  <div className="grid grid-cols-4 gap-3">
                    <FormField control={form.control} name="arrival3in1" render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 border rounded-md p-3">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">3in1</FormLabel>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="arrivalDosing" render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 border rounded-md p-3">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">Dose</FormLabel>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="arrivalDipping" render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 border rounded-md p-3">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">Dip</FormLabel>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="arrivalIsd" render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 border rounded-md p-3">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">Isd</FormLabel>
                      </FormItem>
                    )} />
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-animal">
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Register Stock"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
