import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  db,
  cattleTable,
  investorsTable,
  treatmentsTable,
  weightRecordsTable,
} from "@workspace/db";
import {
  computeMarketProjection,
  type WeightPoint,
} from "../lib/market-projection";

const router: IRouter = Router();

async function isInvestorUser(clerkUserId: string | null): Promise<boolean> {
  if (!clerkUserId) return false;
  const [inv] = await db
    .select({ id: investorsTable.id })
    .from(investorsTable)
    .where(eq(investorsTable.clerkUserId, clerkUserId))
    .limit(1);
  return inv != null;
}

function tally(rows: Array<string | null | undefined>, fallback: string) {
  const counts = new Map<string, number>();
  for (const raw of rows) {
    const label = raw && raw.trim() ? raw : fallback;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

router.get("/reports/summary", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (await isInvestorUser(userId)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const cattle = await db
    .select({
      id: cattleTable.id,
      breed: cattleTable.breed,
      sex: cattleTable.sex,
      stage: cattleTable.stage,
      status: cattleTable.status,
      weightKg: cattleTable.weightKg,
      investorId: cattleTable.investorId,
    })
    .from(cattleTable);

  const cattleIds = cattle.map((c) => c.id);

  const weightRecords =
    cattleIds.length > 0
      ? await db
          .select({
            cattleId: weightRecordsTable.cattleId,
            weightKg: weightRecordsTable.weightKg,
            recordedAt: weightRecordsTable.recordedAt,
          })
          .from(weightRecordsTable)
          .where(inArray(weightRecordsTable.cattleId, cattleIds))
      : [];

  const weightsByCattle = new Map<number, WeightPoint[]>();
  for (const r of weightRecords) {
    const arr = weightsByCattle.get(r.cattleId) ?? [];
    arr.push({ recordedAt: r.recordedAt, weightKg: r.weightKg });
    weightsByCattle.set(r.cattleId, arr);
  }

  const totalCattle = cattle.length;
  const weighed = cattle.filter((c) => c.weightKg != null);
  const totalHerdWeightKg = weighed.reduce((sum, c) => sum + (c.weightKg ?? 0), 0);
  const avgWeightKg =
    weighed.length > 0
      ? Math.round((totalHerdWeightKg / weighed.length) * 10) / 10
      : 0;

  const byBreed = tally(cattle.map((c) => c.breed), "Unknown");
  const bySex = tally(cattle.map((c) => c.sex), "Unspecified");
  const byStage = tally(cattle.map((c) => c.stage), "Unspecified");
  const byStatus = tally(cattle.map((c) => c.status), "Unknown");

  const bucketDefs = [
    { range: "< 200 kg", min: 0, max: 200 },
    { range: "200–300 kg", min: 200, max: 300 },
    { range: "300–400 kg", min: 300, max: 400 },
    { range: "400–500 kg", min: 400, max: 500 },
    { range: "≥ 500 kg", min: 500, max: Infinity },
  ];
  const weightDistribution = bucketDefs.map((b) => ({
    range: b.range,
    count: weighed.filter(
      (c) => (c.weightKg ?? 0) >= b.min && (c.weightKg ?? 0) < b.max
    ).length,
  }));

  const marketReadiness = {
    ready: 0,
    within30: 0,
    within60: 0,
    within90: 0,
    beyond90: 0,
    notProjectable: 0,
  };

  const projectionByCattle = new Map<
    number,
    ReturnType<typeof computeMarketProjection>
  >();

  for (const c of cattle) {
    const proj = computeMarketProjection(
      weightsByCattle.get(c.id) ?? [],
      c.weightKg
    );
    projectionByCattle.set(c.id, proj);

    if (proj.marketReady) {
      marketReadiness.ready += 1;
    } else if (proj.daysToMarket == null) {
      marketReadiness.notProjectable += 1;
    } else if (proj.daysToMarket <= 30) {
      marketReadiness.within30 += 1;
    } else if (proj.daysToMarket <= 60) {
      marketReadiness.within60 += 1;
    } else if (proj.daysToMarket <= 90) {
      marketReadiness.within90 += 1;
    } else {
      marketReadiness.beyond90 += 1;
    }
  }

  const monthAgg = new Map<string, { sum: number; count: number }>();
  for (const r of weightRecords) {
    const month = r.recordedAt.slice(0, 7);
    const cur = monthAgg.get(month) ?? { sum: 0, count: 0 };
    cur.sum += r.weightKg;
    cur.count += 1;
    monthAgg.set(month, cur);
  }
  const growthTrend = [...monthAgg.entries()]
    .map(([month, { sum, count }]) => ({
      month,
      avgWeightKg: Math.round((sum / count) * 10) / 10,
      recordCount: count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const treatments = await db
    .select({
      treatmentType: treatmentsTable.treatmentType,
      completed: treatmentsTable.completed,
    })
    .from(treatmentsTable);

  const treatmentMap = new Map<
    string,
    { total: number; completed: number; pending: number }
  >();
  const treatmentTotals = { total: 0, completed: 0, pending: 0 };
  for (const t of treatments) {
    const cur = treatmentMap.get(t.treatmentType) ?? {
      total: 0,
      completed: 0,
      pending: 0,
    };
    cur.total += 1;
    treatmentTotals.total += 1;
    if (t.completed) {
      cur.completed += 1;
      treatmentTotals.completed += 1;
    } else {
      cur.pending += 1;
      treatmentTotals.pending += 1;
    }
    treatmentMap.set(t.treatmentType, cur);
  }
  const treatmentStats = [...treatmentMap.entries()]
    .map(([treatmentType, s]) => ({ treatmentType, ...s }))
    .sort((a, b) => b.total - a.total);

  const investors = await db
    .select({ id: investorsTable.id, name: investorsTable.name })
    .from(investorsTable);
  const investorNameById = new Map(investors.map((i) => [i.id, i.name]));

  const investorAgg = new Map<
    number,
    { cattleCount: number; totalWeightKg: number; marketReadyCount: number }
  >();
  for (const c of cattle) {
    if (c.investorId == null) continue;
    const cur = investorAgg.get(c.investorId) ?? {
      cattleCount: 0,
      totalWeightKg: 0,
      marketReadyCount: 0,
    };
    cur.cattleCount += 1;
    cur.totalWeightKg += c.weightKg ?? 0;
    if (projectionByCattle.get(c.id)?.marketReady) cur.marketReadyCount += 1;
    investorAgg.set(c.investorId, cur);
  }
  const investorBreakdown = [...investorAgg.entries()]
    .map(([investorId, agg]) => ({
      investorId,
      name: investorNameById.get(investorId) ?? "Unknown",
      cattleCount: agg.cattleCount,
      totalWeightKg: Math.round(agg.totalWeightKg * 10) / 10,
      marketReadyCount: agg.marketReadyCount,
    }))
    .sort((a, b) => b.cattleCount - a.cattleCount);

  res.json({
    totalCattle,
    totalHerdWeightKg: Math.round(totalHerdWeightKg * 10) / 10,
    avgWeightKg,
    byBreed,
    bySex,
    byStage,
    byStatus,
    weightDistribution,
    marketReadiness,
    growthTrend,
    treatmentStats,
    treatmentTotals,
    investorBreakdown,
  });
});

export default router;
