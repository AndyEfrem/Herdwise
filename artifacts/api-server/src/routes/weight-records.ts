import { Router } from "express";
import { db, weightRecordsTable, cattleTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

router.get("/cattle/:id/weights", async (req, res) => {
  const cattleId = parseInt(req.params.id, 10);
  if (isNaN(cattleId)) return res.status(400).json({ error: "Invalid ID" });

  const animal = await db.select({ id: cattleTable.id }).from(cattleTable).where(eq(cattleTable.id, cattleId)).limit(1);
  if (!animal.length) return res.status(404).json({ error: "Animal not found" });

  const records = await db
    .select()
    .from(weightRecordsTable)
    .where(eq(weightRecordsTable.cattleId, cattleId))
    .orderBy(asc(weightRecordsTable.recordedAt));

  res.json(records);
});

router.post("/cattle/:id/weights", async (req, res) => {
  const cattleId = parseInt(req.params.id, 10);
  if (isNaN(cattleId)) return res.status(400).json({ error: "Invalid ID" });

  const animal = await db.select({ id: cattleTable.id }).from(cattleTable).where(eq(cattleTable.id, cattleId)).limit(1);
  if (!animal.length) return res.status(404).json({ error: "Animal not found" });

  const { weightKg, recordedAt, notes, recordedBy } = req.body;
  if (!weightKg || !recordedAt) {
    return res.status(400).json({ error: "weightKg and recordedAt are required" });
  }

  const [record] = await db
    .insert(weightRecordsTable)
    .values({ cattleId, weightKg: parseFloat(weightKg), recordedAt, notes: notes ?? null, recordedBy: recordedBy ?? null })
    .returning();

  await db.update(cattleTable).set({ weightKg: parseFloat(weightKg) }).where(eq(cattleTable.id, cattleId));

  res.status(201).json(record);
});

router.delete("/cattle/:id/weights/:weightId", async (req, res) => {
  const cattleId = parseInt(req.params.id, 10);
  const weightId = parseInt(req.params.weightId, 10);
  if (isNaN(cattleId) || isNaN(weightId)) return res.status(400).json({ error: "Invalid ID" });

  const [deleted] = await db
    .delete(weightRecordsTable)
    .where(eq(weightRecordsTable.id, weightId))
    .returning();

  if (!deleted) return res.status(404).json({ error: "Weight record not found" });

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
