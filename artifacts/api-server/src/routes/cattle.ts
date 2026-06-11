import { Router, type IRouter } from "express";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, cattleTable, investorsTable } from "@workspace/db";
import {
  ListCattleQueryParams,
  CreateAnimalBody,
  GetAnimalParams,
  GetAnimalResponse,
  UpdateAnimalParams,
  UpdateAnimalBody,
  DeleteAnimalParams,
} from "@workspace/api-zod";

async function getInvestorIdForUser(clerkUserId: string | null): Promise<number | null> {
  if (!clerkUserId) return null;
  const [inv] = await db.select({ id: investorsTable.id }).from(investorsTable).where(eq(investorsTable.clerkUserId, clerkUserId)).limit(1);
  return inv?.id ?? null;
}

const router: IRouter = Router();

router.get("/cattle", async (req, res): Promise<void> => {
  const query = ListCattleQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { userId } = getAuth(req);
  const callerInvestorId = await getInvestorIdForUser(userId ?? null);

  const { status, search } = query.data;
  let { investorId } = query.data;

  // Investors can only see their own cattle
  if (callerInvestorId !== null) investorId = callerInvestorId;

  const conditions: SQL[] = [];

  if (status) conditions.push(eq(cattleTable.status, status));
  if (investorId) conditions.push(eq(cattleTable.investorId, investorId));
  if (search) conditions.push(ilike(cattleTable.tag, `%${search}%`));

  const rows = await db
    .select({
      id: cattleTable.id,
      tag: cattleTable.tag,
      previousTag: cattleTable.previousTag,
      breed: cattleTable.breed,
      sex: cattleTable.sex,
      stage: cattleTable.stage,
      description: cattleTable.description,
      status: cattleTable.status,
      weightKg: cattleTable.weightKg,
      dateReceived: cattleTable.dateReceived,
      notes: cattleTable.notes,
      investorId: cattleTable.investorId,
      investorName: investorsTable.name,
      createdAt: cattleTable.createdAt,
    })
    .from(cattleTable)
    .leftJoin(investorsTable, eq(cattleTable.investorId, investorsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(cattleTable.createdAt);

  res.json(rows.map((r) => ({
    ...r,
    previousTag: r.previousTag ?? null,
    sex: r.sex ?? null,
    stage: r.stage ?? null,
    description: r.description ?? null,
    weightKg: r.weightKg ?? null,
    dateReceived: r.dateReceived ?? null,
    notes: r.notes ?? null,
    investorId: r.investorId ?? null,
    investorName: r.investorName ?? null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/cattle", async (req, res): Promise<void> => {
  const parsed = CreateAnimalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [animal] = await db.insert(cattleTable).values(parsed.data).returning();

  let investorName: string | null = null;
  if (animal.investorId) {
    const [inv] = await db.select().from(investorsTable).where(eq(investorsTable.id, animal.investorId));
    investorName = inv?.name ?? null;
  }

  res.status(201).json({
    ...animal,
    weightKg: animal.weightKg ?? null,
    notes: animal.notes ?? null,
    investorId: animal.investorId ?? null,
    investorName,
    createdAt: animal.createdAt.toISOString(),
  });
});

router.get("/cattle/:id", async (req, res): Promise<void> => {
  const params = GetAnimalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { userId } = getAuth(req);
  const callerInvestorId = await getInvestorIdForUser(userId ?? null);

  const [row] = await db
    .select({
      id: cattleTable.id,
      tag: cattleTable.tag,
      previousTag: cattleTable.previousTag,
      breed: cattleTable.breed,
      sex: cattleTable.sex,
      stage: cattleTable.stage,
      description: cattleTable.description,
      status: cattleTable.status,
      weightKg: cattleTable.weightKg,
      dateReceived: cattleTable.dateReceived,
      notes: cattleTable.notes,
      investorId: cattleTable.investorId,
      investorName: investorsTable.name,
      createdAt: cattleTable.createdAt,
    })
    .from(cattleTable)
    .leftJoin(investorsTable, eq(cattleTable.investorId, investorsTable.id))
    .where(eq(cattleTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Animal not found" });
    return;
  }

  // Investors can only view their own cattle
  if (callerInvestorId !== null && row.investorId !== callerInvestorId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json(GetAnimalResponse.parse({
    ...row,
    previousTag: row.previousTag ?? null,
    sex: row.sex ?? null,
    stage: row.stage ?? null,
    description: row.description ?? null,
    weightKg: row.weightKg ?? null,
    dateReceived: row.dateReceived ?? null,
    notes: row.notes ?? null,
    investorId: row.investorId ?? null,
    investorName: row.investorName ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
});

router.patch("/cattle/:id", async (req, res): Promise<void> => {
  const params = UpdateAnimalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAnimalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [animal] = await db
    .update(cattleTable)
    .set(parsed.data)
    .where(eq(cattleTable.id, params.data.id))
    .returning();

  if (!animal) {
    res.status(404).json({ error: "Animal not found" });
    return;
  }

  let investorName: string | null = null;
  if (animal.investorId) {
    const [inv] = await db.select().from(investorsTable).where(eq(investorsTable.id, animal.investorId));
    investorName = inv?.name ?? null;
  }

  res.json({
    ...animal,
    weightKg: animal.weightKg ?? null,
    notes: animal.notes ?? null,
    investorId: animal.investorId ?? null,
    investorName,
    createdAt: animal.createdAt.toISOString(),
  });
});

router.delete("/cattle/:id", async (req, res): Promise<void> => {
  const params = DeleteAnimalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [animal] = await db
    .delete(cattleTable)
    .where(eq(cattleTable.id, params.data.id))
    .returning();

  if (!animal) {
    res.status(404).json({ error: "Animal not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
