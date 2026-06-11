import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, investorsTable, cattleTable } from "@workspace/db";
import {
  CreateInvestorBody,
  GetInvestorParams,
  GetInvestorResponse,
  UpdateInvestorParams,
  UpdateInvestorBody,
  DeleteInvestorParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/investors", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: investorsTable.id,
      name: investorsTable.name,
      email: investorsTable.email,
      phone: investorsTable.phone,
      clerkUserId: investorsTable.clerkUserId,
      createdAt: investorsTable.createdAt,
      cattleCount: count(cattleTable.id),
    })
    .from(investorsTable)
    .leftJoin(cattleTable, eq(investorsTable.id, cattleTable.investorId))
    .groupBy(investorsTable.id)
    .orderBy(investorsTable.createdAt);

  res.json(rows.map((r) => ({
    ...r,
    email: r.email ?? null,
    phone: r.phone ?? null,
    clerkUserId: r.clerkUserId ?? null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/investors", async (req, res): Promise<void> => {
  const parsed = CreateInvestorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [investor] = await db.insert(investorsTable).values(parsed.data).returning();

  res.status(201).json({
    ...investor,
    email: investor.email ?? null,
    phone: investor.phone ?? null,
    cattleCount: 0,
    createdAt: investor.createdAt.toISOString(),
  });
});

router.get("/investors/:id", async (req, res): Promise<void> => {
  const params = GetInvestorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: investorsTable.id,
      name: investorsTable.name,
      email: investorsTable.email,
      phone: investorsTable.phone,
      clerkUserId: investorsTable.clerkUserId,
      createdAt: investorsTable.createdAt,
      cattleCount: count(cattleTable.id),
    })
    .from(investorsTable)
    .leftJoin(cattleTable, eq(investorsTable.id, cattleTable.investorId))
    .where(eq(investorsTable.id, params.data.id))
    .groupBy(investorsTable.id);

  if (!row) {
    res.status(404).json({ error: "Investor not found" });
    return;
  }

  res.json(GetInvestorResponse.parse({
    ...row,
    email: row.email ?? null,
    phone: row.phone ?? null,
    clerkUserId: row.clerkUserId ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
});

router.patch("/investors/:id", async (req, res): Promise<void> => {
  const params = UpdateInvestorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateInvestorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [investor] = await db
    .update(investorsTable)
    .set(parsed.data)
    .where(eq(investorsTable.id, params.data.id))
    .returning();

  if (!investor) {
    res.status(404).json({ error: "Investor not found" });
    return;
  }

  const [{ cattleCount }] = await db
    .select({ cattleCount: count(cattleTable.id) })
    .from(cattleTable)
    .where(eq(cattleTable.investorId, investor.id));

  res.json({
    ...investor,
    email: investor.email ?? null,
    phone: investor.phone ?? null,
    clerkUserId: investor.clerkUserId ?? null,
    cattleCount,
    createdAt: investor.createdAt.toISOString(),
  });
});

router.delete("/investors/:id", async (req, res): Promise<void> => {
  const params = DeleteInvestorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [investor] = await db
    .delete(investorsTable)
    .where(eq(investorsTable.id, params.data.id))
    .returning();

  if (!investor) {
    res.status(404).json({ error: "Investor not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
