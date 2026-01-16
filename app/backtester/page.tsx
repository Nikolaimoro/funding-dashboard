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
 * Fetches all exchanges with their available base tokens (not quote assets)
 * Uses pagination to handle large datasets
 * 
 * Process:
 * 1. Query exchange, base_asset, quote_asset, market_id, ref_url in 1000-row chunks
 * 2. Group rows by exchange and base_asset
 * 3. For each base_asset, collect all quote assets and their market info
 * 4. Return sorted nested structure
 * 
 * @returns {Promise<Array>} Nested array of exchanges with their base assets and quotes
 * @example
 * const exchanges = await getAllExchanges();
 * // [
 * //   { 
 * //     exchange: "binance", 
 * //     baseAssets: [ 
 * //       { 
 * //         asset: "BTC", 
 * //         quotes: [ { asset: "USDT", marketId: 123, refUrl: "..." } ]
 * //       }
 * //     ]
 * //   }
 * // ]
 */
async function getAllExchanges(): Promise<{ exchange: string; baseAssets: { asset: string; quotes: { asset: string; marketId: number; refUrl: string | null }[] }[] }[]> {
  let allRows: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("funding_dashboard_mv")
      .select("exchange, base_asset, quote_asset, market_id, ref_url")
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

  // Group by exchange -> base_asset -> quote_asset
  const exchangeMap = new Map<string, Map<string, Map<string, { marketId: number; refUrl: string | null }>>>();

  allRows.forEach(row => {
    if (!exchangeMap.has(row.exchange)) {
      exchangeMap.set(row.exchange, new Map());
    }
    
    const baseMap = exchangeMap.get(row.exchange)!;
    if (!baseMap.has(row.base_asset)) {
      baseMap.set(row.base_asset, new Map());
    }
    
    const quoteMap = baseMap.get(row.base_asset)!;
    if (row.quote_asset && row.market_id && !quoteMap.has(row.quote_asset)) {
      quoteMap.set(row.quote_asset, { marketId: row.market_id, refUrl: row.ref_url || null });
    }
  });

  return Array.from(exchangeMap.entries())
    .map(([exchange, baseMap]) => ({
      exchange,
      baseAssets: Array.from(baseMap.entries())
        .map(([asset, quoteMap]) => ({
          asset,
          quotes: Array.from(quoteMap.entries())
            .map(([quoteAsset, { marketId, refUrl }]) => ({ asset: quoteAsset, marketId, refUrl }))
            .sort((a, b) => a.asset.localeCompare(b.asset)),
        }))
        .sort((a, b) => a.asset.localeCompare(b.asset)),
    }))
    .sort((a, b) => a.exchange.localeCompare(b.exchange));
}

export default async function BacktesterPage() {
  const tokens = await getAllTokens();
  const exchanges = await getAllExchanges();

  return (
    <main className="min-h-screen bg-gray-900 p-6 text-gray-200">
      <h1 className="text-2xl font-outfit font-medium mb-6">
        Funding Arbitrage Backtester
      </h1>
      <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
        <BacktesterClient tokens={tokens} exchanges={exchanges} />
      </Suspense>
    </main>
  );
}
