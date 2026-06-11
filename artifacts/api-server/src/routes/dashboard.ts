import { Router, type IRouter } from "express";
import { eq, count, avg, gte, and, isNotNull } from "drizzle-orm";
import { db, cattleTable, investorsTable, treatmentsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ totalCattle }] = await db
    .select({ totalCattle: count(cattleTable.id) })
    .from(cattleTable);

  const [{ activeCattle }] = await db
    .select({ activeCattle: count(cattleTable.id) })
    .from(cattleTable)
    .where(eq(cattleTable.status, "active"));

  const [{ activeInvestors }] = await db
    .select({ activeInvestors: count(investorsTable.id) })
    .from(investorsTable);

  const [{ averageWeightKg, animalsWeighed }] = await db
    .select({
      averageWeightKg: avg(cattleTable.weightKg),
      animalsWeighed: count(cattleTable.id),
    })
    .from(cattleTable)
    .where(isNotNull(cattleTable.weightKg));

  const [{ vaccinationsDue }] = await db
    .select({ vaccinationsDue: count(treatmentsTable.id) })
    .from(treatmentsTable)
    .where(
      and(
        eq(treatmentsTable.completed, false),
        gte(treatmentsTable.scheduledDate, today)
      )
    );

  const allCattle = await db
    .select({ status: cattleTable.status })
    .from(cattleTable);

  const statusCounts: Record<string, number> = {};
  for (const { status } of allCattle) {
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }

  const knownStatuses = ["active", "quarantined"];
  const otherCount = Object.entries(statusCounts)
    .filter(([s]) => !knownStatuses.includes(s))
    .reduce((sum, [, c]) => sum + c, 0);

  const herdBreakdown = [
    { status: "active", count: statusCounts["active"] ?? 0 },
    { status: "quarantined", count: statusCounts["quarantined"] ?? 0 },
    { status: "other", count: otherCount },
  ].map((row) => ({
    ...row,
    percentage: totalCattle > 0 ? Math.round((row.count / totalCattle) * 100) : 0,
  }));

  const upcomingCareRows = await db
    .select({
      id: treatmentsTable.id,
      cattleTag: cattleTable.tag,
      treatmentType: treatmentsTable.treatmentType,
      scheduledDate: treatmentsTable.scheduledDate,
    })
    .from(treatmentsTable)
    .leftJoin(cattleTable, eq(treatmentsTable.cattleId, cattleTable.id))
    .where(
      and(
        eq(treatmentsTable.completed, false),
        gte(treatmentsTable.scheduledDate, today)
      )
    )
    .orderBy(treatmentsTable.scheduledDate)
    .limit(10);

  res.json({
    totalCattle,
    activeCattle,
    activeInvestors,
    averageWeightKg: parseFloat(averageWeightKg ?? "0"),
    animalsWeighed,
    vaccinationsDue,
    herdBreakdown,
    upcomingCare: upcomingCareRows.map((r) => ({
      id: r.id,
      cattleTag: r.cattleTag ?? "Unknown",
      treatmentType: r.treatmentType,
      scheduledDate: r.scheduledDate,
    })),
  });
});

export default router;
