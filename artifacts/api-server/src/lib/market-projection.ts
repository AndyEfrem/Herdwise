export const MARKET_WEIGHT_KG = 500;

const MS_PER_DAY = 86_400_000;

export interface WeightPoint {
  recordedAt: string;
  weightKg: number;
}

export interface MarketProjection {
  marketWeightKg: number;
  marketReady: boolean;
  weightRecordCount: number;
  avgDailyGainKg: number | null;
  daysToMarket: number | null;
  projectedMarketDate: string | null;
}

function toDayIndex(dateStr: string, origin: number): number {
  return (Date.parse(dateStr) - origin) / MS_PER_DAY;
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Projects when an animal will reach market weight using least-squares linear
 * regression over its weight history. Points must be sorted ascending by date.
 */
export function computeMarketProjection(
  points: WeightPoint[],
  currentWeightKg: number | null,
  marketWeightKg: number = MARKET_WEIGHT_KG,
): MarketProjection {
  const sorted = [...points].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  const latestWeight = sorted.length > 0 ? sorted[sorted.length - 1].weightKg : currentWeightKg;

  const base: MarketProjection = {
    marketWeightKg,
    marketReady: latestWeight != null && latestWeight >= marketWeightKg,
    weightRecordCount: sorted.length,
    avgDailyGainKg: null,
    daysToMarket: null,
    projectedMarketDate: null,
  };

  if (base.marketReady) {
    base.daysToMarket = 0;
    base.projectedMarketDate = formatDate(Date.now());
    return base;
  }

  // Need at least two records on distinct dates to fit a trend line.
  if (sorted.length < 2) return base;

  const origin = Date.parse(sorted[0].recordedAt);
  const xs = sorted.map((p) => toDayIndex(p.recordedAt, origin));
  const ys = sorted.map((p) => p.weightKg);
  const n = xs.length;

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXX = xs.reduce((a, x) => a + x * x, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return base; // all records share one date

  const slope = (n * sumXY - sumX * sumY) / denom; // kg/day
  const intercept = (sumY - slope * sumX) / n;

  base.avgDailyGainKg = Math.round(slope * 100) / 100;

  // Not gaining weight — no meaningful projection.
  if (slope <= 0) return base;

  const dayAtMarket = (marketWeightKg - intercept) / slope; // days since origin
  const projectedMs = origin + dayAtMarket * MS_PER_DAY;
  base.projectedMarketDate = formatDate(projectedMs);

  const days = Math.round((projectedMs - Date.now()) / MS_PER_DAY);
  base.daysToMarket = days < 0 ? 0 : days;

  return base;
}
