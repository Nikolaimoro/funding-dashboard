import { supabase } from "@/lib/supabase";
import BacktesterForm from "@/components/BacktesterForm";

export const revalidate = 3600; // revalidate every hour

async function getAllTokens(): Promise<string[]> {
  const { data, error } = await supabase
    .from("arb_opportunities_enriched")
    .select("base_asset")
    .order("base_asset", { ascending: true });

  if (error) {
    console.error("Failed to fetch tokens:", error);
    return [];
  }

  // Get unique tokens and remove duplicates
  const unique = Array.from(new Set((data ?? []).map(d => d.base_asset)));
  return unique;
}

async function getAllExchanges(): Promise<{ exchange: string; quotes: string[] }[]> {
  const { data, error } = await supabase
    .from("arb_opportunities_enriched")
    .select("long_exchange, long_quote, short_exchange, short_quote");

  if (error) {
    console.error("Failed to fetch exchanges:", error);
    return [];
  }

  const exchangeMap = new Map<string, Set<string>>();

  (data ?? []).forEach(row => {
    // Add long exchange
    if (!exchangeMap.has(row.long_exchange)) {
      exchangeMap.set(row.long_exchange, new Set());
    }
    if (row.long_quote) {
      exchangeMap.get(row.long_exchange)?.add(row.long_quote);
    }

    // Add short exchange
    if (!exchangeMap.has(row.short_exchange)) {
      exchangeMap.set(row.short_exchange, new Set());
    }
    if (row.short_quote) {
      exchangeMap.get(row.short_exchange)?.add(row.short_quote);
    }
  });

  return Array.from(exchangeMap.entries())
    .map(([exchange, quotes]) => ({
      exchange,
      quotes: Array.from(quotes).sort(),
    }))
    .sort((a, b) => a.exchange.localeCompare(b.exchange));
}

export default async function BacktesterPage() {
  const tokens = await getAllTokens();
  const exchanges = await getAllExchanges();

  return (
    <main className="min-h-screen bg-gray-900 p-6 text-gray-200">
      <h1 className="text-2xl font-semibold mb-6">Funding Arbitrage Backtester</h1>
      <BacktesterForm tokens={tokens} exchanges={exchanges} />
    </main>
  );
}
