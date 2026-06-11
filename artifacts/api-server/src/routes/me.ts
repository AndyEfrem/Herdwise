import { Router } from "express";
import { db, investorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, resolveRole } from "../lib/auth";

const router = Router();

router.get("/me", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { role, investorId } = await resolveRole(userId);

  let investorName: string | null = null;
  if (role === "investor" && investorId !== null) {
    const [inv] = await db
      .select({ name: investorsTable.name })
      .from(investorsTable)
      .where(eq(investorsTable.id, investorId))
      .limit(1);
    investorName = inv?.name ?? null;
  }

  res.json({
    clerkUserId: userId,
    role,
    investorId: role === "investor" ? investorId : null,
    investorName,
  });
});

export default router;
