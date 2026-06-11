import { Router } from "express";
import { db, weightRecordsTable, cattleTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin, requireMember } from "../lib/auth";

const router = Router();

router.get("/cattle/:id/weights", async (req, res): Promise<void> => {
  const cattleId = parseInt(req.params.id, 10);
  if (isNaN(cattleId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const access = await requireMember(req, res);
  if (!access) return;

  const [animal] = await db
    .select({ id: cattleTable.id, investorId: cattleTable.investorId })
    .from(cattleTable)
    .where(eq(cattleTable.id, cattleId))
    .limit(1);
  if (!animal) { res.status(404).json({ error: "Animal not found" }); return; }

  // Investors may only view weights for their own cattle.
  if (!access.admin && animal.investorId !== access.investorId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const records = await db
    .select()
    .from(weightRecordsTable)
    .where(eq(weightRecordsTable.cattleId, cattleId))
    .orderBy(asc(weightRecordsTable.recordedAt));

  res.json(records);
});

router.post("/cattle/:id/weights", async (req, res): Promise<void> => {
  const cattleId = parseInt(req.params.id, 10);
  if (isNaN(cattleId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  if (!(await requireAdmin(req, res))) return;

  const animal = await db.select({ id: cattleTable.id }).from(cattleTable).where(eq(cattleTable.id, cattleId)).limit(1);
  if (!animal.length) { res.status(404).json({ error: "Animal not found" }); return; }

  const { weightKg, recordedAt, notes, recordedBy } = req.body;
  if (!weightKg || !recordedAt) {
    res.status(400).json({ error: "weightKg and recordedAt are required" }); return;
  }

  const [record] = await db
    .insert(weightRecordsTable)
    .values({ cattleId, weightKg: parseFloat(weightKg), recordedAt, notes: notes ?? null, recordedBy: recordedBy ?? null })
    .returning();

  await db.update(cattleTable).set({ weightKg: parseFloat(weightKg) }).where(eq(cattleTable.id, cattleId));

  res.status(201).json(record);
});

router.delete("/cattle/:id/weights/:weightId", async (req, res): Promise<void> => {
  const cattleId = parseInt(req.params.id, 10);
  const weightId = parseInt(req.params.weightId, 10);
  if (isNaN(cattleId) || isNaN(weightId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  if (!(await requireAdmin(req, res))) return;

  const [deleted] = await db
    .delete(weightRecordsTable)
    .where(eq(weightRecordsTable.id, weightId))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Weight record not found" }); return; }

  const remaining = await db
    .select()
    .from(weightRecordsTable)
    .where(eq(weightRecordsTable.cattleId, cattleId))
    .orderBy(asc(weightRecordsTable.recordedAt));

  if (remaining.length > 0) {
    const latest = remaining[remaining.length - 1];
    await db.update(cattleTable).set({ weightKg: latest.weightKg }).where(eq(cattleTable.id, cattleId));
  }

  res.status(204).send();
});

export default router;
