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
 * Normalizes token symbol by removing multiplier prefixes/suffixes
 * Useful for fuzzy matching and searching (PEPE1000 → PEPE, 1000SHIB → SHIB)
 * 
 * Process:
 * 1. Convert to uppercase
 * 2. Remove MULTIPLIERS prefixes (1000, 10, etc.) until none remain
 * 3. Remove MULTIPLIERS suffixes (1000, 10, etc.) until none remain
 * 
 * @param s - Token symbol to normalize (e.g., "1000pepe", "shib1000")
 * @returns Normalized uppercase symbol (e.g., "PEPE", "SHIB")
 * @example
 * normalizeToken("1000PEPE")    // "PEPE"
 * normalizeToken("pepe1000")    // "PEPE"
 * normalizeToken("SHIB")        // "SHIB"
 * normalizeToken("1000shib1000") // "SHIB"
 */
export function normalizeToken(s: string): string {
  let x = (s ?? "").toUpperCase().trim();

  // Remove multiplier prefixes
  for (const m of MULTIPLIERS) {
    while (x.startsWith(m)) x = x.slice(m.length);
  }

  // Remove multiplier suffixes
  for (const m of MULTIPLIERS) {
    while (x.endsWith(m)) x = x.slice(0, -m.length);
  }

  return x;
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
