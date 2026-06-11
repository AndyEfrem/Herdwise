import {
  computeMarketProjection,
  type MarketProjection,
  type WeightPoint,
} from "./market-projection";

export interface CattleRow {
  id: number;
  breed: string | null;
  sex: string | null;
  stage: string | null;
  status: string;
  weightKg: number | null;
  investorId: number | null;
}

export interface WeightRow {
  cattleId: number;
  weightKg: number;
  recordedAt: string;
}

export interface TreatmentRow {
  treatmentType: string;
  completed: boolean;
}

export function tally(
  rows: Array<string | null | undefined>,
  fallback: string,
) {
  const counts = new Map<string, number>();
  for (const raw of rows) {
    const label = raw && raw.trim() ? raw : fallback;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function groupWeights(records: WeightRow[]): Map<number, WeightPoint[]> {
  const byCattle = new Map<number, WeightPoint[]>();
  for (const r of records) {
    const arr = byCattle.get(r.cattleId) ?? [];
    arr.push({ recordedAt: r.recordedAt, weightKg: r.weightKg });
    byCattle.set(r.cattleId, arr);
  }
  return byCattle;
}

export function computeTotals(cattle: CattleRow[]) {
  const weighed = cattle.filter((c) => c.weightKg != null);
  const totalHerdWeightKg = weighed.reduce(
    (sum, c) => sum + (c.weightKg ?? 0),
    0,
  );
  const avgWeightKg =
    weighed.length > 0
      ? Math.round((totalHerdWeightKg / weighed.length) * 10) / 10
      : 0;
  return {
    totalCattle: cattle.length,
    totalHerdWeightKg: Math.round(totalHerdWeightKg * 10) / 10,
    avgWeightKg,
    weighed,
  };
}

const BUCKET_DEFS = [
  { range: "< 200 kg", min: 0, max: 200 },
  { range: "200–300 kg", min: 200, max: 300 },
  { range: "300–400 kg", min: 300, max: 400 },
  { range: "400–500 kg", min: 400, max: 500 },
  { range: "≥ 500 kg", min: 500, max: Infinity },
];

export function computeWeightDistribution(weighed: CattleRow[]) {
  return BUCKET_DEFS.map((b) => ({
    range: b.range,
    count: weighed.filter(
      (c) => (c.weightKg ?? 0) >= b.min && (c.weightKg ?? 0) < b.max,
    ).length,
  }));
}

export function computeMarketReadiness(
  cattle: CattleRow[],
  weightsByCattle: Map<number, WeightPoint[]>,
) {
  const marketReadiness = {
    ready: 0,
    within30: 0,
    within60: 0,
    within90: 0,
    beyond90: 0,
    notProjectable: 0,
  };
  const projectionByCattle = new Map<number, MarketProjection>();

  for (const c of cattle) {
    const proj = computeMarketProjection(
      weightsByCattle.get(c.id) ?? [],
      c.weightKg,
    );
    projectionByCattle.set(c.id, proj);

    if (proj.marketReady) marketReadiness.ready += 1;
    else if (proj.daysToMarket == null) marketReadiness.notProjectable += 1;
    else if (proj.daysToMarket <= 30) marketReadiness.within30 += 1;
    else if (proj.daysToMarket <= 60) marketReadiness.within60 += 1;
    else if (proj.daysToMarket <= 90) marketReadiness.within90 += 1;
    else marketReadiness.beyond90 += 1;
  }

  return { marketReadiness, projectionByCattle };
}

export function computeGrowthTrend(records: WeightRow[]) {
  const monthAgg = new Map<string, { sum: number; count: number }>();
  for (const r of records) {
    const month = r.recordedAt.slice(0, 7);
    const cur = monthAgg.get(month) ?? { sum: 0, count: 0 };
    cur.sum += r.weightKg;
    cur.count += 1;
    monthAgg.set(month, cur);
  }
  return [...monthAgg.entries()]
    .map(([month, { sum, count }]) => ({
      month,
      avgWeightKg: Math.round((sum / count) * 10) / 10,
      recordCount: count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function computeTreatmentStats(treatments: TreatmentRow[]) {
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
  return { treatmentStats, treatmentTotals };
}
