import { Router, type IRouter } from "express";
import { eq, count, asc } from "drizzle-orm";
import { db, adminsTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { CreateAdminBody, DeleteAdminParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admins", async (req, res): Promise<void> => {
  const userId = await requireAdmin(req, res);
  if (!userId) return;

  const rows = await db
    .select()
    .from(adminsTable)
    .orderBy(asc(adminsTable.createdAt));

  res.json(
    rows.map((r) => ({
      id: r.id,
      clerkUserId: r.clerkUserId,
      email: r.email ?? null,
      createdAt: r.createdAt.toISOString(),
      isSelf: r.clerkUserId === userId,
    })),
  );
});

router.post("/admins", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const parsed = CreateAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const clerkUserId = parsed.data.clerkUserId.trim();
  if (!clerkUserId) {
    res.status(400).json({ error: "clerkUserId is required" });
    return;
  }

  const [existing] = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(eq(adminsTable.clerkUserId, clerkUserId))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "This user is already an administrator" });
    return;
  }

  const [admin] = await db
    .insert(adminsTable)
    .values({ clerkUserId, email: parsed.data.email ?? null })
    .returning();

  res.status(201).json({
    id: admin.id,
    clerkUserId: admin.clerkUserId,
    email: admin.email ?? null,
    createdAt: admin.createdAt.toISOString(),
    isSelf: false,
  });
});

router.delete("/admins/:id", async (req, res): Promise<void> => {
  const userId = await requireAdmin(req, res);
  if (!userId) return;

  const params = DeleteAdminParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [target] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.id, params.data.id))
    .limit(1);
  if (!target) {
    res.status(404).json({ error: "Administrator not found" });
    return;
  }
  if (target.clerkUserId === userId) {
    res.status(400).json({ error: "You cannot revoke your own admin access" });
    return;
  }

  const [{ total }] = await db
    .select({ total: count(adminsTable.id) })
    .from(adminsTable);
  if (total <= 1) {
    res.status(400).json({ error: "Cannot remove the last administrator" });
    return;
  }

  await db.delete(adminsTable).where(eq(adminsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
