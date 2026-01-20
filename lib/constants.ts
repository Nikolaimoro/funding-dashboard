/**
 * Application constants
 * Exchange labels, multipliers, RPC function names, etc.
 */

export const EXCHANGE_LABEL: Record<string, string> = {
  bybit: "Bybit",
  mexc: "MEXC",
  bingx: "BingX",
  paradex: "Paradex",
  binance: "Binance",
  hyperliquid: "Hyperliquid",
  gate: "Gate.io",
  okx: "OKX",
  aster: "Aster",
  variational: "Variational",
  lighter: "Lighter",
  edgex: "edgeX",
};

/**
 * Numeric multiplier prefixes/suffixes that are removed during token normalization
 * Used for search matching to handle cases like "1000PEPE", "PEPE1000", etc.
 */
export const MULTIPLIERS = ["1000000", "100000", "10000", "1000", "100", "10"] as const;

export const RPC_FUNCTIONS = {
  FUNDING_CHART: "get_funding_chart",
  ARB_CHART: "get_arb_chart_data",
  ARB_PNL: "get_arb_pnl",
} as const;

export const SUPABASE_TABLES = {
  FUNDING_DASHBOARD_MV: "funding_dashboard_mv",
  ARB_OPPORTUNITIES: "arb_opportunities_enriched",
} as const;

export const PAGINATION_LIMITS = [20, 50, 100, -1] as const;
export const DEFAULT_PAGE_SIZE = 1000; // for server-side fetching

export const TIME_WINDOWS = {
  "1d": "1d",
  "3d": "3d",
  "7d": "7d",
  "15d": "15d",
  "30d": "30d",
} as const;

export const SCREENER_TIME_WINDOWS = ["now", "1d", "3d", "7d", "15d", "30d"] as const;

export const SCREENER_TIME_LABELS: Record<string, string> = {
  now: "Now",
  "1d": "1d",
  "3d": "3d",
  "7d": "7d",
  "15d": "15d",
  "30d": "30d",
};
