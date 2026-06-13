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
import { requireAdmin, clerkClient } from "../lib/auth";

const router: IRouter = Router();

router.get("/investors", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

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

  res.json(
    rows.map((r) => ({
      ...r,
      phone: r.phone ?? null,
      clerkUserId: r.clerkUserId ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.post("/investors", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const parsed = CreateInvestorBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [investor] = await db
    .insert(investorsTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email ?? "",
      phone: parsed.data.phone ?? null,
    })
    .returning();

  res.status(201).json({
    ...investor,
    phone: investor.phone ?? null,
    clerkUserId: investor.clerkUserId ?? null,
    cattleCount: 0,
    createdAt: investor.createdAt.toISOString(),
  });
});

router.post("/investors/:id/invite", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = GetInvestorParams.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [investor] = await db
    .select()
    .from(investorsTable)
    .where(eq(investorsTable.id, params.data.id))
    .limit(1);

  if (!investor) {
    res.status(404).json({ error: "Investor not found" });
    return;
  }

  if (!investor.email) {
    res.status(400).json({
      error: "Investor does not have an email address",
    });
    return;
  }

  try {
    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: investor.email,
      notify: true,
      ignoreExisting: true,
      redirectUrl: "http://localhost:5173/",
    });

    res.json({
      success: true,
      invitationId: invitation.id,
      email: investor.email,
    });
  } catch (error) {
    console.error("Failed to create invitation:", error);

    res.status(500).json({
      error: "Failed to send invitation",
    });
  }
});

router.get("/investors/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

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

  res.json(
    GetInvestorResponse.parse({
      ...row,
      phone: row.phone ?? null,
      clerkUserId: row.clerkUserId ?? null,
      createdAt: row.createdAt.toISOString(),
    }),
  );
});

router.patch("/investors/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

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

  const updateData: {
    name?: string;
    email?: string;
    phone?: string | null;
    clerkUserId?: string | null;
  } = {};

  if (parsed.data.name !== undefined) {
    updateData.name = parsed.data.name;
  }

  if (parsed.data.email !== undefined && parsed.data.email !== null) {
    updateData.email = parsed.data.email;
  }

  if (parsed.data.phone !== undefined) {
    updateData.phone = parsed.data.phone ?? null;
  }

  if (parsed.data.clerkUserId !== undefined) {
    updateData.clerkUserId = parsed.data.clerkUserId;
  }

  const [investor] = await db
    .update(investorsTable)
    .set(updateData)
    .where(eq(investorsTable.id, params.data.id))
    .returning();

  if (!investor) {
    res.status(404).json({ error: "Investor not found" });
    return;
  }

  const [{ cattleCount }] = await db
    .select({
      cattleCount: count(cattleTable.id),
    })
    .from(cattleTable)
    .where(eq(cattleTable.investorId, investor.id));

  res.json({
    ...investor,
    phone: investor.phone ?? null,
    clerkUserId: investor.clerkUserId ?? null,
    cattleCount,
    createdAt: investor.createdAt.toISOString(),
  });
});

router.delete("/investors/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

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