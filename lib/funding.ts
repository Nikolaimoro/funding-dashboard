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
 * @param markets - The markets object from the row
 * @param timeWindow - Time window to use for rate calculation
 * @param selectedColumnKeys - Optional set of column keys to consider (for exchange filtering)
 */
export function calculateMaxArb(
  markets: Record<string, FundingMatrixMarket> | null | undefined,
  timeWindow: TimeWindow,
  selectedColumnKeys?: Set<string>
): number | null {
  if (!markets) return null;
  const rates: number[] = [];
  for (const [columnKey, market] of Object.entries(markets)) {
    if (!market) continue;
    // If filtering by column keys, skip non-matching
    if (selectedColumnKeys && !selectedColumnKeys.has(columnKey)) continue;
    const rate = getRate(market, timeWindow);
    if (rate !== null) rates.push(rate);
  }
  if (rates.length < 2) return null;
  return Math.max(...rates) - Math.min(...rates);
}
