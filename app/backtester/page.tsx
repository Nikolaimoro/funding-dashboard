import { supabase } from "@/lib/supabase";
import BacktesterClient from "@/app/backtester/client";
import { Suspense } from "react";

export const revalidate = 3600; // revalidate every hour

const PAGE_SIZE = 1000;

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

async function getAllExchanges(): Promise<{ exchange: string; quotes: { asset: string; marketId: number }[] }[]> {
  let allRows: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("funding_dashboard_mv")
      .select("exchange, quote_asset, market_id")
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

  // Group by exchange and get unique quote assets with market_id
  const exchangeMap = new Map<string, Map<string, number>>();

  allRows.forEach(row => {
    if (!exchangeMap.has(row.exchange)) {
      exchangeMap.set(row.exchange, new Map());
    }
    if (row.quote_asset && row.market_id) {
      // Store the first market_id for each quote_asset to avoid duplicates
      const quoteMap = exchangeMap.get(row.exchange)!;
      if (!quoteMap.has(row.quote_asset)) {
        quoteMap.set(row.quote_asset, row.market_id);
      }
    }
  });

  return Array.from(exchangeMap.entries())
    .map(([exchange, quoteMap]) => ({
      exchange,
      quotes: Array.from(quoteMap.entries())
        .map(([asset, marketId]) => ({ asset, marketId }))
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
