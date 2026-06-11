import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  cattleTable,
  investorsTable,
  treatmentsTable,
  weightRecordsTable,
} from "@workspace/db";
import { requireAdmin, requireMember } from "../lib/auth";
import {
  computeMarketProjection,
  MARKET_WEIGHT_KG,
} from "../lib/market-projection";
import {
  type CattleRow,
  tally,
  groupWeights,
  computeTotals,
  computeWeightDistribution,
  computeMarketReadiness,
  computeGrowthTrend,
  computeTreatmentStats,
} from "../lib/report-aggregates";

const router: IRouter = Router();

/**
 * Builds a progress report scoped to a single investor's cattle. Returns null
 * if the investor does not exist.
 */
async function buildInvestorReport(investorId: number) {
  const [investor] = await db
    .select({ id: investorsTable.id, name: investorsTable.name })
    .from(investorsTable)
    .where(eq(investorsTable.id, investorId))
    .limit(1);
  if (!investor) return null;

  const cattle = await db
    .select({
      id: cattleTable.id,
      tag: cattleTable.tag,
      breed: cattleTable.breed,
      sex: cattleTable.sex,
      stage: cattleTable.stage,
      status: cattleTable.status,
      weightKg: cattleTable.weightKg,
      investorId: cattleTable.investorId,
    })
    .from(cattleTable)
    .where(eq(cattleTable.investorId, investorId));

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

  const treatments =
    cattleIds.length > 0
      ? await db
          .select({
            treatmentType: treatmentsTable.treatmentType,
            completed: treatmentsTable.completed,
          })
          .from(treatmentsTable)
          .where(inArray(treatmentsTable.cattleId, cattleIds))
      : [];

  const weightsByCattle = groupWeights(weightRecords);
  const rows: CattleRow[] = cattle;
  const { totalCattle, totalHerdWeightKg, avgWeightKg, weighed } =
    computeTotals(rows);
  const weightDistribution = computeWeightDistribution(weighed);
  const { marketReadiness, projectionByCattle } = computeMarketReadiness(
    rows,
    weightsByCattle,
  );
  const growthTrend = computeGrowthTrend(weightRecords);
  const { treatmentStats, treatmentTotals } = computeTreatmentStats(treatments);

  const animals = cattle
    .map((c) => {
      const proj =
        projectionByCattle.get(c.id) ??
        computeMarketProjection(weightsByCattle.get(c.id) ?? [], c.weightKg);
      const percentToTarget =
        c.weightKg != null
          ? Math.min(100, Math.round((c.weightKg / MARKET_WEIGHT_KG) * 1000) / 10)
          : 0;
      return {
        id: c.id,
        tag: c.tag,
        breed: c.breed ?? null,
        status: c.status,
        weightKg: c.weightKg ?? null,
        targetWeightKg: MARKET_WEIGHT_KG,
        percentToTarget,
        marketReady: proj.marketReady,
        daysToMarket: proj.daysToMarket,
        projectedMarketDate: proj.projectedMarketDate,
        avgDailyGainKg: proj.avgDailyGainKg,
      };
    })
    .sort((a, b) => {
      // Closest to market first; ready animals first, unprojectable last.
      const rank = (x: typeof a) =>
        x.marketReady ? -1 : x.daysToMarket ?? Number.MAX_SAFE_INTEGER;
      return rank(a) - rank(b);
    });

  const marketReadyCount = animals.filter((a) => a.marketReady).length;

  return {
    investorId: investor.id,
    investorName: investor.name,
    generatedAt: new Date().toISOString(),
    totalCattle,
    totalHerdWeightKg,
    avgWeightKg,
    marketReadyCount,
    weightDistribution,
    marketReadiness,
    growthTrend,
    treatmentStats,
    treatmentTotals,
    animals,
  };
}

router.get("/reports/summary", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const cattle: CattleRow[] = await db
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

  const weightsByCattle = groupWeights(weightRecords);
  const { totalCattle, totalHerdWeightKg, avgWeightKg, weighed } =
    computeTotals(cattle);

  const byBreed = tally(cattle.map((c) => c.breed), "Unknown");
  const bySex = tally(cattle.map((c) => c.sex), "Unspecified");
  const byStage = tally(cattle.map((c) => c.stage), "Unspecified");
  const byStatus = tally(cattle.map((c) => c.status), "Unknown");

  const weightDistribution = computeWeightDistribution(weighed);
  const { marketReadiness, projectionByCattle } = computeMarketReadiness(
    cattle,
    weightsByCattle,
  );
  const growthTrend = computeGrowthTrend(weightRecords);

  const treatments = await db
    .select({
      treatmentType: treatmentsTable.treatmentType,
      completed: treatmentsTable.completed,
    })
    .from(treatmentsTable);
  const { treatmentStats, treatmentTotals } = computeTreatmentStats(treatments);

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
    .map(([id, agg]) => ({
      investorId: id,
      name: investorNameById.get(id) ?? "Unknown",
      cattleCount: agg.cattleCount,
      totalWeightKg: Math.round(agg.totalWeightKg * 10) / 10,
      marketReadyCount: agg.marketReadyCount,
    }))
    .sort((a, b) => b.cattleCount - a.cattleCount);

  res.json({
    totalCattle,
    totalHerdWeightKg,
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

// Per-investor report: accessible to admins, or to the investor viewing their own.
router.get("/reports/investors/:investorId", async (req, res): Promise<void> => {
  const access = await requireMember(req, res);
  if (!access) return;

  const investorId = Number(req.params.investorId);
  if (!Number.isInteger(investorId) || investorId <= 0) {
    res.status(400).json({ error: "Invalid investor id" });
    return;
  }

  // Investors may only access their own report; admins may access any.
  if (!access.admin && access.investorId !== investorId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const report = await buildInvestorReport(investorId);
  if (!report) {
    res.status(404).json({ error: "Investor not found" });
    return;
  }
  res.json(report);
});

// Share-link management — admin only.
/**
 * Parses a positive-integer investor id from a route param. Sends a 400 and
 * returns null if the param is malformed.
 */
function parseInvestorId(
  raw: string,
  res: import("express").Response,
): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid investor id" });
    return null;
  }
  return id;
}

router.get(
  "/reports/investors/:investorId/share",
  async (req, res): Promise<void> => {
    if (!(await requireAdmin(req, res))) return;
    const investorId = parseInvestorId(req.params.investorId, res);
    if (investorId === null) return;
    const [inv] = await db
      .select({ shareToken: investorsTable.shareToken })
      .from(investorsTable)
      .where(eq(investorsTable.id, investorId))
      .limit(1);
    if (!inv) {
      res.status(404).json({ error: "Investor not found" });
      return;
    }
    res.json({ enabled: inv.shareToken != null, token: inv.shareToken ?? null });
  },
);

router.post(
  "/reports/investors/:investorId/share",
  async (req, res): Promise<void> => {
    if (!(await requireAdmin(req, res))) return;
    const investorId = parseInvestorId(req.params.investorId, res);
    if (investorId === null) return;
    const token = randomBytes(24).toString("base64url");
    const [updated] = await db
      .update(investorsTable)
      .set({ shareToken: token })
      .where(eq(investorsTable.id, investorId))
      .returning({ shareToken: investorsTable.shareToken });
    if (!updated) {
      res.status(404).json({ error: "Investor not found" });
      return;
    }
    res.json({ enabled: true, token: updated.shareToken });
  },
);

router.delete(
  "/reports/investors/:investorId/share",
  async (req, res): Promise<void> => {
    if (!(await requireAdmin(req, res))) return;
    const investorId = parseInvestorId(req.params.investorId, res);
    if (investorId === null) return;
    const [updated] = await db
      .update(investorsTable)
      .set({ shareToken: null })
      .where(eq(investorsTable.id, investorId))
      .returning({ id: investorsTable.id });
    if (!updated) {
      res.status(404).json({ error: "Investor not found" });
      return;
    }
    res.json({ enabled: false, token: null });
  },
);

// Public shared report — no authentication. Resolves the opaque token.
router.get("/reports/shared/:token", async (req, res): Promise<void> => {
  const token = req.params.token;
  if (!token) {
    res.status(404).json({ error: "Invalid share link" });
    return;
  }
  const [inv] = await db
    .select({ id: investorsTable.id })
    .from(investorsTable)
    .where(eq(investorsTable.shareToken, token))
    .limit(1);
  if (!inv) {
    res.status(404).json({ error: "Invalid or revoked share link" });
    return;
  }
  const report = await buildInvestorReport(inv.id);
  if (!report) {
    res.status(404).json({ error: "Invalid or revoked share link" });
    return;
  }
  res.json(report);
});

export default router;
