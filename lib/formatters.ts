/**
 * Data formatters for USD, percentages, tokens, etc.
 * Used across tables and components
 * Returns strings and objects only - NO JSX here!
 */

import { EXCHANGE_LABEL, MULTIPLIERS } from "./constants";

/* ================= NUMBER FORMATTERS ================= */

const compactUSDFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Formats a number as compact USD notation (e.g., 1.5M, 2.3K)
 * @param v - Number to format, or null/NaN to show "–"
 * @returns Formatted string like "$1.5M" or "–"
 * @example
 * formatCompactUSD(1500000) // "$1.5M"
 * formatCompactUSD(null)    // "–"
 */
export function formatCompactUSD(v: number | null): string {
  if (v == null || Number.isNaN(v)) {
    return "–";
  }
  return `$${compactUSDFormatter.format(v)}`;
}

/**
 * Formats a number as full USD (e.g., $1,234,567)
 * @param v - Number to format, or null/NaN to show "–"
 * @returns Formatted string like "$1,234,567" or "–"
 * @example
 * formatUSD(1234567) // "$1,234,567"
 * formatUSD(null)    // "–"
 */
export function formatUSD(v: number | null): string {
  if (v == null || Number.isNaN(v)) {
    return "–";
  }
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/**
 * Formats a number as APR percentage with 2 decimal places
 * @param v - Number to format (as percentage), or null/NaN to show "–"
 * @returns Formatted string like "5.25%" or "–"
 * @example
 * formatAPR(5.2567) // "5.26%"
 * formatAPR(null)   // "–"
 */
export function formatAPR(v: number | null): string {
  if (v == null || Number.isNaN(v)) {
    return "–";
  }
  return `${v.toFixed(2)}%`;
}

/**
 * Formats a number as percentage with configurable decimal places
 * @param v - Number to format (as percentage), or null/NaN to show "–"
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string like "5.3%" or "–"
 * @example
 * formatPercent(5.2567)    // "5.26%"
 * formatPercent(5.2567, 1) // "5.3%"
 */
export function formatPercent(v: number | null, decimals = 2): string {
  if (v == null || Number.isNaN(v)) {
    return "–";
  }
  return `${v.toFixed(decimals)}%`;
}

/* ================= TEXT FORMATTERS ================= */

/**
 * Formats exchange name using the EXCHANGE_LABEL mapping
 * Falls back to the original string if not found in mapping
 * @param ex - Exchange identifier (e.g., "binance", "bybit")
 * @returns Formatted exchange name (e.g., "Binance", "ByBit")
 * @example
 * formatExchange("binance") // "Binance"
 * formatExchange("unknown") // "unknown"
 */
export function formatExchange(ex: string): string {
  return EXCHANGE_LABEL[ex] ?? ex;
}

/**
 * Normalizes token symbol for search/comparison
 * Removes numeric multiplier prefixes/suffixes but preserves letter multipliers
 * (to allow searching for MAKER, BLUR, KAVA without them being stripped)
 * 
 * @param s - Token symbol to normalize (e.g., "1000PEPE", "PEPE1000", "1MBABYDOGE")
 * @returns Normalized uppercase symbol without numeric multipliers
 * @example
 * normalizeToken("1000PEPE")   // "PEPE"
 * normalizeToken("PEPE1000")   // "PEPE"
 * normalizeToken("1MBABYDOGE") // "BABYDOGE"
 * normalizeToken("MAKER")      // "MAKER" (letter M is preserved)
 */
export function normalizeToken(s: string): string {
  let token = (s ?? "").toUpperCase().trim();

  // Remove numeric multiplier prefixes (1000000, 100000, ..., 10)
  for (const mult of MULTIPLIERS) {
    if (token.startsWith(mult)) {
      token = token.slice(mult.length);
      break;
    }
  }

  // Remove numeric multiplier suffixes (1000000, 100000, ..., 10)
  for (const mult of MULTIPLIERS) {
    if (token.endsWith(mult)) {
      token = token.slice(0, -mult.length);
      break;
    }
  }

  return token;
}

/**
 * Alias for normalizeToken - same functionality
 * @see normalizeToken
 */
export function normalizeSymbol(s: string): string {
  return normalizeToken(s);
}

/* ================= MISC ================= */

export const compactUSD = compactUSDFormatter; // Re-export for direct use if needed
