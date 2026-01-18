/**
 * Funding rate calculation helpers
 */

import { FundingMatrixMarket, TimeWindow } from "@/lib/types";

/**
 * Get the rate for a specific time window from a market
 */
export function getRate(
  market: FundingMatrixMarket | null | undefined,
  timeWindow: TimeWindow
): number | null {
  if (!market) return null;
  return market[timeWindow] ?? null;
}

/**
 * Calculate max arbitrage spread for a token row
 * Max rate - Min rate = spread
 */
export function calculateMaxArb(
  markets: Record<string, FundingMatrixMarket> | null | undefined,
  timeWindow: TimeWindow
): number | null {
  if (!markets) return null;
  const rates: number[] = [];
  for (const market of Object.values(markets)) {
    if (!market) continue;
    const rate = getRate(market, timeWindow);
    if (rate !== null) rates.push(rate);
  }
  if (rates.length < 2) return null;
  return Math.max(...rates) - Math.min(...rates);
}
