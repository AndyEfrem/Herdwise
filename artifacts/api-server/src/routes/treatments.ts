import { Router, type IRouter } from "express";
import { eq, and, gte, type SQL } from "drizzle-orm";
import { db, treatmentsTable, cattleTable } from "@workspace/db";
import { requireAdmin, requireMember } from "../lib/auth";
import {
  ListTreatmentsQueryParams,
  CreateTreatmentBody,
  UpdateTreatmentParams,
  UpdateTreatmentBody,
  DeleteTreatmentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/treatments", async (req, res): Promise<void> => {
  const query = ListTreatmentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const access = await requireMember(req, res);
  if (!access) return;

  const { cattleId, upcoming } = query.data;
  const conditions: SQL[] = [];

  if (cattleId != null) conditions.push(eq(treatmentsTable.cattleId, cattleId));
  if (upcoming === true) {
    const today = new Date().toISOString().slice(0, 10);
    conditions.push(gte(treatmentsTable.scheduledDate, today));
    conditions.push(eq(treatmentsTable.completed, false));
  }
  // Investors only see treatments for their own cattle.
  if (!access.admin && access.investorId !== null) {
    conditions.push(eq(cattleTable.investorId, access.investorId));
  }

  const rows = await db
    .select({
      id: treatmentsTable.id,
      cattleId: treatmentsTable.cattleId,
      cattleTag: cattleTable.tag,
      treatmentType: treatmentsTable.treatmentType,
      scheduledDate: treatmentsTable.scheduledDate,
      completed: treatmentsTable.completed,
      completedAt: treatmentsTable.completedAt,
      notes: treatmentsTable.notes,
      createdAt: treatmentsTable.createdAt,
    })
    .from(treatmentsTable)
    .leftJoin(cattleTable, eq(treatmentsTable.cattleId, cattleTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(treatmentsTable.scheduledDate);

  res.json(rows.map((r) => ({
    ...r,
    cattleTag: r.cattleTag ?? null,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    notes: r.notes ?? null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/treatments", async (req, res): Promise<void> => {
  const parsed = CreateTreatmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!(await requireAdmin(req, res))) return;

  const [treatment] = await db.insert(treatmentsTable).values(parsed.data).returning();

  const [cattle] = await db.select().from(cattleTable).where(eq(cattleTable.id, treatment.cattleId));

  res.status(201).json({
    ...treatment,
    cattleTag: cattle?.tag ?? null,
    completedAt: treatment.completedAt ? treatment.completedAt.toISOString() : null,
    notes: treatment.notes ?? null,
    createdAt: treatment.createdAt.toISOString(),
  });
});

router.patch("/treatments/:id", async (req, res): Promise<void> => {
  const params = UpdateTreatmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTreatmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!(await requireAdmin(req, res))) return;

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.completed === true && !parsed.data.completedAt) {
    updateData.completedAt = new Date();
  }

  const [treatment] = await db
    .update(treatmentsTable)
    .set(updateData)
    .where(eq(treatmentsTable.id, params.data.id))
    .returning();

  if (!treatment) {
    res.status(404).json({ error: "Treatment not found" });
    return;
  }

  const [cattle] = await db.select().from(cattleTable).where(eq(cattleTable.id, treatment.cattleId));

  res.json({
    ...treatment,
    cattleTag: cattle?.tag ?? null,
    completedAt: treatment.completedAt ? treatment.completedAt.toISOString() : null,
    notes: treatment.notes ?? null,
    createdAt: treatment.createdAt.toISOString(),
  });
});

router.delete("/treatments/:id", async (req, res): Promise<void> => {
  const params = DeleteTreatmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await requireAdmin(req, res))) return;

  const [treatment] = await db
    .delete(treatmentsTable)
    .where(eq(treatmentsTable.id, params.data.id))
    .returning();

  if (!treatment) {
    res.status(404).json({ error: "Treatment not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
