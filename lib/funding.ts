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

export type ArbPair = {
  longKey: string;
  longMarket: FundingMatrixMarket;
  longRate: number;
  shortKey: string;
  shortMarket: FundingMatrixMarket;
  shortRate: number;
  spread: number;
};

/**
 * Find the long/short pair that creates the max arb spread
 * Long = lower rate (you pay less), Short = higher rate (you receive more)
 */
export function findArbPair(
  markets: Record<string, FundingMatrixMarket> | null | undefined,
  timeWindow: TimeWindow,
  selectedColumnKeys?: Set<string>
): ArbPair | null {
  if (!markets) return null;
  
  const entries: { key: string; market: FundingMatrixMarket; rate: number }[] = [];
  
  for (const [columnKey, market] of Object.entries(markets)) {
    if (!market) continue;
    if (selectedColumnKeys && !selectedColumnKeys.has(columnKey)) continue;
    const rate = getRate(market, timeWindow);
    if (rate !== null) {
      entries.push({ key: columnKey, market, rate });
    }
  }
  
  if (entries.length < 2) return null;
  
  // Find min and max rate entries
  let minEntry = entries[0];
  let maxEntry = entries[0];
  
  for (const entry of entries) {
    if (entry.rate < minEntry.rate) minEntry = entry;
    if (entry.rate > maxEntry.rate) maxEntry = entry;
  }
  
  if (minEntry === maxEntry) return null;
  
  return {
    longKey: minEntry.key,
    longMarket: minEntry.market,
    longRate: minEntry.rate,
    shortKey: maxEntry.key,
    shortMarket: maxEntry.market,
    shortRate: maxEntry.rate,
    spread: maxEntry.rate - minEntry.rate,
  };
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

export function findArbPairPinned(
  markets: Record<string, FundingMatrixMarket> | null | undefined,
  timeWindow: TimeWindow,
  selectedColumnKeys: Set<string>,
  pinnedKey: string | null
): ArbPair | null {
  if (!markets) return null;
  if (!pinnedKey) return findArbPair(markets, timeWindow, selectedColumnKeys);
  if (!selectedColumnKeys.has(pinnedKey)) {
    return findArbPair(markets, timeWindow, selectedColumnKeys);
  }

  const pinnedMarket = markets[pinnedKey];
  const pinnedRate = getRate(pinnedMarket, timeWindow);
  if (!pinnedMarket || pinnedRate === null) {
    return findArbPair(markets, timeWindow, selectedColumnKeys);
  }

  const entries: { key: string; market: FundingMatrixMarket; rate: number }[] =
    [];
  for (const [columnKey, market] of Object.entries(markets)) {
    if (!market) continue;
    if (!selectedColumnKeys.has(columnKey)) continue;
    if (columnKey === pinnedKey) continue;
    const rate = getRate(market, timeWindow);
    if (rate !== null) {
      entries.push({ key: columnKey, market, rate });
    }
  }

  if (entries.length === 0) return null;

  let minEntry = entries[0];
  let maxEntry = entries[0];
  for (const entry of entries) {
    if (entry.rate < minEntry.rate) minEntry = entry;
    if (entry.rate > maxEntry.rate) maxEntry = entry;
  }

  const spreadIfPinnedLong = maxEntry.rate - pinnedRate;
  const spreadIfPinnedShort = pinnedRate - minEntry.rate;

  if (spreadIfPinnedLong >= spreadIfPinnedShort) {
    if (spreadIfPinnedLong <= 0) return null;
    return {
      longKey: pinnedKey,
      longMarket: pinnedMarket,
      longRate: pinnedRate,
      shortKey: maxEntry.key,
      shortMarket: maxEntry.market,
      shortRate: maxEntry.rate,
      spread: spreadIfPinnedLong,
    };
  }

  if (spreadIfPinnedShort <= 0) return null;
  return {
    longKey: minEntry.key,
    longMarket: minEntry.market,
    longRate: minEntry.rate,
    shortKey: pinnedKey,
    shortMarket: pinnedMarket,
    shortRate: pinnedRate,
    spread: spreadIfPinnedShort,
  };
}

type ForcedSide = "long" | "short";

const resolveEntries = (
  markets: Record<string, FundingMatrixMarket> | null | undefined,
  timeWindow: TimeWindow,
  selectedColumnKeys: Set<string>
) => {
  if (!markets) return [];
  const entries: { key: string; market: FundingMatrixMarket; rate: number }[] =
    [];
  for (const [columnKey, market] of Object.entries(markets)) {
    if (!market) continue;
    if (!selectedColumnKeys.has(columnKey)) continue;
    const rate = getRate(market, timeWindow);
    if (rate !== null) {
      entries.push({ key: columnKey, market, rate });
    }
  }
  return entries;
};

const pickMinMax = (
  entries: { key: string; market: FundingMatrixMarket; rate: number }[],
  forcedSides?: Map<string, ForcedSide>
) => {
  const minCandidates = entries.filter(
    (entry) => forcedSides?.get(entry.key) !== "short"
  );
  const maxCandidates = entries.filter(
    (entry) => forcedSides?.get(entry.key) !== "long"
  );
  if (minCandidates.length === 0 || maxCandidates.length === 0) return null;
  let minEntry = minCandidates[0];
  let maxEntry = maxCandidates[0];
  for (const entry of minCandidates) {
    if (entry.rate < minEntry.rate) minEntry = entry;
  }
  for (const entry of maxCandidates) {
    if (entry.rate > maxEntry.rate) maxEntry = entry;
  }
  if (minEntry.key === maxEntry.key) return null;
  return { minEntry, maxEntry };
};

export function findArbPairPinnedWithForcedSides(
  markets: Record<string, FundingMatrixMarket> | null | undefined,
  timeWindow: TimeWindow,
  selectedColumnKeys: Set<string>,
  pinnedKey: string | null,
  forcedSides?: Map<string, ForcedSide>
): ArbPair | null {
  if (!forcedSides || forcedSides.size === 0) {
    return findArbPairPinned(markets, timeWindow, selectedColumnKeys, pinnedKey);
  }
  if (!markets) return null;

  if (
    pinnedKey &&
    selectedColumnKeys.has(pinnedKey) &&
    forcedSides.has(pinnedKey)
  ) {
    const pinnedMarket = markets[pinnedKey];
    const pinnedRate = getRate(pinnedMarket, timeWindow);
    if (!pinnedMarket || pinnedRate === null) return null;
    const entries = resolveEntries(markets, timeWindow, selectedColumnKeys).filter(
      (entry) => entry.key !== pinnedKey
    );
    if (entries.length === 0) return null;
    const forcedSide = forcedSides.get(pinnedKey);
    if (forcedSide === "long") {
      const maxEntry = entries.reduce((best, entry) =>
        entry.rate > best.rate ? entry : best
      );
      const spread = maxEntry.rate - pinnedRate;
      if (spread <= 0) return null;
      return {
        longKey: pinnedKey,
        longMarket: pinnedMarket,
        longRate: pinnedRate,
        shortKey: maxEntry.key,
        shortMarket: maxEntry.market,
        shortRate: maxEntry.rate,
        spread,
      };
    }
    const minEntry = entries.reduce((best, entry) =>
      entry.rate < best.rate ? entry : best
    );
    const spread = pinnedRate - minEntry.rate;
    if (spread <= 0) return null;
    return {
      longKey: minEntry.key,
      longMarket: minEntry.market,
      longRate: minEntry.rate,
      shortKey: pinnedKey,
      shortMarket: pinnedMarket,
      shortRate: pinnedRate,
      spread,
    };
  }

  if (!pinnedKey || !selectedColumnKeys.has(pinnedKey)) {
    const entries = resolveEntries(markets, timeWindow, selectedColumnKeys);
    if (entries.length < 2) return null;
    const resolved = pickMinMax(entries, forcedSides);
    if (!resolved) return null;
    const { minEntry, maxEntry } = resolved;
    return {
      longKey: minEntry.key,
      longMarket: minEntry.market,
      longRate: minEntry.rate,
      shortKey: maxEntry.key,
      shortMarket: maxEntry.market,
      shortRate: maxEntry.rate,
      spread: maxEntry.rate - minEntry.rate,
    };
  }

  const pinnedMarket = markets[pinnedKey];
  const pinnedRate = getRate(pinnedMarket, timeWindow);
  if (!pinnedMarket || pinnedRate === null) {
    const entries = resolveEntries(markets, timeWindow, selectedColumnKeys);
    const resolved = pickMinMax(entries, forcedSides);
    if (!resolved) return null;
    const { minEntry, maxEntry } = resolved;
    return {
      longKey: minEntry.key,
      longMarket: minEntry.market,
      longRate: minEntry.rate,
      shortKey: maxEntry.key,
      shortMarket: maxEntry.market,
      shortRate: maxEntry.rate,
      spread: maxEntry.rate - minEntry.rate,
    };
  }

  const entries = resolveEntries(markets, timeWindow, selectedColumnKeys).filter(
    (entry) => entry.key !== pinnedKey
  );
  if (entries.length === 0) return null;

  const maxCandidates = entries.filter(
    (entry) => forcedSides.get(entry.key) !== "long"
  );
  const minCandidates = entries.filter(
    (entry) => forcedSides.get(entry.key) !== "short"
  );
  if (maxCandidates.length === 0 || minCandidates.length === 0) return null;

  let maxEntry = maxCandidates[0];
  let minEntry = minCandidates[0];
  for (const entry of maxCandidates) {
    if (entry.rate > maxEntry.rate) maxEntry = entry;
  }
  for (const entry of minCandidates) {
    if (entry.rate < minEntry.rate) minEntry = entry;
  }

  const spreadIfPinnedLong = maxEntry.rate - pinnedRate;
  const spreadIfPinnedShort = pinnedRate - minEntry.rate;

  if (spreadIfPinnedLong >= spreadIfPinnedShort) {
    if (spreadIfPinnedLong <= 0) return null;
    return {
      longKey: pinnedKey,
      longMarket: pinnedMarket,
      longRate: pinnedRate,
      shortKey: maxEntry.key,
      shortMarket: maxEntry.market,
      shortRate: maxEntry.rate,
      spread: spreadIfPinnedLong,
    };
  }

  if (spreadIfPinnedShort <= 0) return null;
  return {
    longKey: minEntry.key,
    longMarket: minEntry.market,
    longRate: minEntry.rate,
    shortKey: pinnedKey,
    shortMarket: pinnedMarket,
    shortRate: pinnedRate,
    spread: spreadIfPinnedShort,
  };
}

export function calculateMaxArbPinnedWithForcedSides(
  markets: Record<string, FundingMatrixMarket> | null | undefined,
  timeWindow: TimeWindow,
  selectedColumnKeys: Set<string>,
  pinnedKey: string | null,
  forcedSides?: Map<string, ForcedSide>
): number | null {
  const pair = findArbPairPinnedWithForcedSides(
    markets,
    timeWindow,
    selectedColumnKeys,
    pinnedKey,
    forcedSides
  );
  return pair ? pair.spread : null;
}

export function calculateMaxArbPinned(
  markets: Record<string, FundingMatrixMarket> | null | undefined,
  timeWindow: TimeWindow,
  selectedColumnKeys: Set<string>,
  pinnedKey: string | null
): number | null {
  const pair = findArbPairPinned(
    markets,
    timeWindow,
    selectedColumnKeys,
    pinnedKey
  );
  return pair ? pair.spread : null;
}

export function buildBacktesterUrl(
  token: string,
  arbPair: ArbPair | null
): string | null {
  if (!arbPair) return null;
  const longExchange = arbPair.longMarket.exchange;
  const shortExchange = arbPair.shortMarket.exchange;
  const longQuote = arbPair.longMarket.quote;
  const shortQuote = arbPair.shortMarket.quote;
  if (!longExchange || !shortExchange || !longQuote || !shortQuote) return null;
  const exchange1 = `${longExchange}${String(longQuote).toLowerCase()}`;
  const exchange2 = `${shortExchange}${String(shortQuote).toLowerCase()}`;
  return `/backtester?token=${encodeURIComponent(token)}&exchange1=${encodeURIComponent(exchange1)}&exchange2=${encodeURIComponent(exchange2)}`;
}
