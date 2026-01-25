"use client";

import { useSearchParams } from "next/navigation";
import BacktesterForm from "@/components/BacktesterForm";

interface BacktesterClientProps {
  tokens: string[];
  exchanges: { exchange: string; baseAssets: { asset: string; quotes: { asset: string; side: "long" | "short" | null; market: string | null; marketId: number; refUrl: string | null; volume24h: number | null; openInterest: number | null }[] }[] }[];
}

/**
 * Parse exchange+quote format from URL parameter
 * Examples: "binanceusdt" → ["binance", "usdt"], "bybitusdc" → ["bybit", "usdc"]
 * Tries all known quote assets to find the split point
 */
function parseExchangeQuote(
  param: string,
  exchanges: BacktesterClientProps["exchanges"]
): { exchange: string; quote: string } | null {
  if (!param) return null;

  const lowerParam = param.toLowerCase();
  const allQuotes = new Set<string>();
  exchanges.forEach(ex =>
    ex.baseAssets.forEach(ba => 
      ba.quotes.forEach(q => allQuotes.add(q.asset.toLowerCase()))
    )
  );

  // Try to find quote asset at the end of param
  for (const quote of allQuotes) {
    if (lowerParam.endsWith(quote)) {
      const exchange = lowerParam.slice(0, -quote.length);
      // Validate exchange exists
      if (exchanges.some(ex => ex.exchange.toLowerCase() === exchange)) {
        return { exchange, quote: quote.toUpperCase() };
      }
    }
  }

  return null;
}

export default function BacktesterClient({ tokens, exchanges }: BacktesterClientProps) {
  const searchParams = useSearchParams();

  // Initialize from URL params or empty
  const urlToken = searchParams.get("token") || "";
  const exchange1Param = searchParams.get("exchange1") || "";
  const exchange2Param = searchParams.get("exchange2") || "";
  const hasParams = Boolean(urlToken || exchange1Param || exchange2Param);
  const initialToken = hasParams ? urlToken : "BTC";

  // Parse exchange+quote format from URL
  const exchange1Parsed = parseExchangeQuote(exchange1Param, exchanges);
  const exchange2Parsed = parseExchangeQuote(exchange2Param, exchanges);

  const initialLongEx = exchange1Parsed?.exchange || (hasParams ? "" : "bybit");
  const initialShortEx = exchange2Parsed?.exchange || (hasParams ? "" : "binance");
  const initialLongQuote = exchange1Parsed?.quote || "";
  const initialShortQuote = exchange2Parsed?.quote || "";

  return (
    <BacktesterForm
      tokens={tokens}
      exchanges={exchanges}
      initialToken={initialToken}
      initialLongEx={initialLongEx}
      initialShortEx={initialShortEx}
      initialLongQuote={initialLongQuote}
      initialShortQuote={initialShortQuote}
    />
  );
}
