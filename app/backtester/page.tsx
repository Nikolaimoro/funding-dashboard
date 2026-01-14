import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import BacktesterClient from "@/app/backtester/client";
import { Suspense } from "react";

export const revalidate = 3600; // revalidate every hour

export const metadata: Metadata = {
  title: "Funding Arbitrage Backtester | Funding Dashboard",
  description: "Backtest cryptocurrency arbitrage strategies with historical funding rate data",
  keywords: ["backtester", "arbitrage", "crypto", "funding rates", "strategy testing"],
  openGraph: {
    title: "Funding Arbitrage Backtester | Funding Dashboard",
    description: "Backtest cryptocurrency arbitrage strategies with historical funding rate data",
    type: "website",
  },
};

const PAGE_SIZE = 1000;

/**
 * Fetches all unique tokens from the funding_dashboard_mv table
 * Uses pagination to handle large datasets (>1000 rows)
 * 
 * Process:
 * 1. Query base_asset column in 1000-row chunks
 * 2. Collect all base_asset values
 * 3. Remove duplicates using Set
 * 4. Sort alphabetically
 * 
 * @returns {Promise<string[]>} Sorted array of unique token symbols
 * @example
 * const tokens = await getAllTokens();
 * // ["AAVE", "ADA", "BTC", "ETH", ...]
 */
async function getAllTokens(): Promise<string[]> {
  let allTokens: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("funding_dashboard_mv")
      .select("base_asset")
      .order("base_asset", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Failed to fetch tokens:", error);
      break;
    }

    if (!data || data.length === 0) break;

    allTokens.push(...data.map(d => d.base_asset));

    if (data.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  // Get unique tokens
  return Array.from(new Set(allTokens)).sort();
}

/**
 * Fetches all exchanges with their available quote assets and market information
 * Uses pagination to handle large datasets
 * 
 * Process:
 * 1. Query exchange, quote_asset, market_id, ref_url in 1000-row chunks
 * 2. Group rows by exchange and quote_asset
 * 3. For each quote_asset, store first market_id and ref_url (avoid duplicates)
 * 4. Return sorted nested structure: [ { exchange, quotes: [ { asset, marketId, refUrl } ] } ]
 * 
 * @returns {Promise<Array>} Nested array of exchanges with their quote assets
 * @example
 * const exchanges = await getAllExchanges();
 * // [
 * //   { exchange: "binance", quotes: [ { asset: "USDT", marketId: 123, refUrl: "..." } ] },
 * //   { exchange: "bybit", quotes: [ { asset: "USDT", marketId: 456, refUrl: "..." } ] }
 * // ]
 */
async function getAllExchanges(): Promise<{ exchange: string; quotes: { asset: string; marketId: number; refUrl: string | null }[] }[]> {
  let allRows: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("funding_dashboard_mv")
      .select("exchange, quote_asset, market_id, ref_url")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Failed to fetch exchanges:", error);
      break;
    }

    if (!data || data.length === 0) break;

    allRows.push(...data);

    if (data.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  // Group by exchange and get unique quote assets with market_id and ref_url
  const exchangeMap = new Map<string, Map<string, { marketId: number; refUrl: string | null }>>();

  allRows.forEach(row => {
    if (!exchangeMap.has(row.exchange)) {
      exchangeMap.set(row.exchange, new Map());
    }
    if (row.quote_asset && row.market_id) {
      // Store the first market_id and ref_url for each quote_asset to avoid duplicates
      const quoteMap = exchangeMap.get(row.exchange)!;
      if (!quoteMap.has(row.quote_asset)) {
        quoteMap.set(row.quote_asset, { marketId: row.market_id, refUrl: row.ref_url || null });
      }
    }
  });

  return Array.from(exchangeMap.entries())
    .map(([exchange, quoteMap]) => ({
      exchange,
      quotes: Array.from(quoteMap.entries())
        .map(([asset, { marketId, refUrl }]) => ({ asset, marketId, refUrl }))
        .sort((a, b) => a.asset.localeCompare(b.asset)),
    }))
    .sort((a, b) => a.exchange.localeCompare(b.exchange));
}

export default async function BacktesterPage() {
  const tokens = await getAllTokens();
  const exchanges = await getAllExchanges();

  return (
    <main className="min-h-screen bg-gray-900 p-6 text-gray-200">
      <h1 className="text-2xl font-semibold mb-6">Funding Arbitrage Backtester</h1>
      <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
        <BacktesterClient tokens={tokens} exchanges={exchanges} />
      </Suspense>
    </main>
  );
}
