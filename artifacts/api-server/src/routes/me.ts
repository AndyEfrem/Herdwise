import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, investorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/me", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [investor] = await db
    .select({ id: investorsTable.id, name: investorsTable.name })
    .from(investorsTable)
    .where(eq(investorsTable.clerkUserId, userId))
    .limit(1);

  if (investor) {
    res.json({ clerkUserId: userId, role: "investor", investorId: investor.id, investorName: investor.name });
  } else {
    res.json({ clerkUserId: userId, role: "admin", investorId: null, investorName: null });
  }
});

export default router;
