import { Metadata } from "next";
import { Suspense } from "react";
import BacktesterClient from "@/app/backtester/client";
import PageHeader from "@/components/ui/PageHeader";
import { supabase } from "@/lib/supabase";
import { EXCHANGE_SEO_LIST } from "@/lib/constants";
import { safeJsonLd } from "@/lib/seo";

export const revalidate = 3600; // revalidate every hour

const exchangeKeywords = EXCHANGE_SEO_LIST.slice(0, 10);

export const metadata: Metadata = {
  title: "Crypto Funding Arbitrage Backtester | bendbasis",
  description: "Backtest cryptocurrency funding arbitrage strategies with historical funding rate data across exchanges.",
  keywords: [
    "backtester",
    "arbitrage",
    "crypto",
    "funding rates",
    "funding rates crypto",
    "funding history",
    "strategy testing",
    ...exchangeKeywords,
  ],
  alternates: {
    canonical: "/backtester",
  },
  openGraph: {
    title: "Crypto Funding Arbitrage Backtester | bendbasis",
    description: "Backtest cryptocurrency funding arbitrage strategies with historical funding rate data across exchanges.",
    type: "website",
  },
};

const PAGE_SIZE = 1000;

type ExchangeRow = {
  exchange: string;
  base_asset: string;
  quote_asset: string;
  market: string | null;
  market_id: number;
  ref_url: string | null;
  volume_24h: number | null;
  open_interest: number | null;
};

async function getBacktesterData(): Promise<{
  tokens: string[];
  exchanges: {
    exchange: string;
    baseAssets: {
      asset: string;
      quotes: {
        asset: string;
        side: "long" | "short" | null;
        market: string | null;
        marketId: number;
        refUrl: string | null;
        volume24h: number | null;
        openInterest: number | null;
      }[];
    }[];
  }[];
}> {
  let allRows: ExchangeRow[] = [];
  let lastMarketId: number | null = null;

  while (true) {
    let query = supabase
      .from("funding_dashboard_mv")
      .select(
        "exchange, base_asset, quote_asset, market, market_id, ref_url, volume_24h, open_interest"
      )
      .order("market_id", { ascending: true })
      .limit(PAGE_SIZE);

    if (lastMarketId !== null) {
      query = query.gt("market_id", lastMarketId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch exchanges:", error);
      break;
    }

    if (!data || data.length === 0) break;

    allRows.push(...(data as ExchangeRow[]));

    const last = data[data.length - 1] as ExchangeRow | undefined;
    lastMarketId = last?.market_id ?? lastMarketId;

    if (data.length < PAGE_SIZE) break;
  }

  const tokens = Array.from(
    new Set(allRows.map((row) => row.base_asset).filter(Boolean))
  ).sort();

  const exchangeMap = new Map<
    string,
    Map<
      string,
      Map<
        string,
        {
          asset: string;
          side: "long" | "short" | null;
          market: string | null;
          marketId: number;
          refUrl: string | null;
          volume24h: number | null;
          openInterest: number | null;
        }
      >
    >
  >();

  const getSide = (market: string | null) => {
    if (!market) return null;
    const match = market.match(/\s+(LONG|SHORT)\s*$/i);
    if (!match) return null;
    return match[1].toLowerCase() as "long" | "short";
  };

  allRows.forEach((row) => {
    if (!exchangeMap.has(row.exchange)) {
      exchangeMap.set(row.exchange, new Map());
    }

    const baseMap = exchangeMap.get(row.exchange)!;
    if (!baseMap.has(row.base_asset)) {
      baseMap.set(row.base_asset, new Map());
    }

    const quoteMap = baseMap.get(row.base_asset)!;
    if (row.quote_asset && row.market_id) {
      const side = getSide(row.market ?? null);
      const key = side ? `${row.quote_asset}:${side}` : row.quote_asset;
      if (!quoteMap.has(key)) {
        quoteMap.set(key, {
          asset: row.quote_asset,
          side,
          market: row.market ?? null,
          marketId: row.market_id,
          refUrl: row.ref_url || null,
          volume24h: row.volume_24h ?? null,
          openInterest: row.open_interest ?? null,
        });
      }
    }
  });

  const exchanges = Array.from(exchangeMap.entries())
    .map(([exchange, baseMap]) => ({
      exchange,
      baseAssets: Array.from(baseMap.entries())
        .map(([asset, quoteMap]) => ({
          asset,
          quotes: Array.from(quoteMap.entries())
            .map(([, { asset, side, market, marketId, refUrl, volume24h, openInterest }]) => ({
              asset,
              side,
              market,
              marketId,
              refUrl,
              volume24h,
              openInterest,
            }))
            .sort((a, b) => {
              const base = a.asset.localeCompare(b.asset);
              if (base !== 0) return base;
              return (a.side ?? "").localeCompare(b.side ?? "");
            }),
        }))
        .sort((a, b) => a.asset.localeCompare(b.asset)),
    }))
    .sort((a, b) => a.exchange.localeCompare(b.exchange));

  return { tokens, exchanges };
}

export default async function BacktesterPage() {
  const { tokens, exchanges } = await getBacktesterData();
  const exchangeList = EXCHANGE_SEO_LIST.join(", ");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Crypto Funding Arbitrage Backtester",
    description:
      "Backtest cryptocurrency funding arbitrage strategies with historical funding rate data across exchanges.",
    publisher: {
      "@type": "Organization",
      name: "bendbasis",
    },
  };

  return (
    <main className="min-h-screen text-gray-200">
      <PageHeader title="Funding Arbitrage Backtester" />
      <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
        <BacktesterClient tokens={tokens} exchanges={exchanges} />
      </Suspense>
      <section className="sr-only" aria-hidden="true">
        <h2>Backtest funding arbitrage across exchanges</h2>
        <p>
          Run funding arbitrage backtests across exchanges like {exchangeList}
          with historical funding rate data and exchange-level comparisons.
        </p>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />
    </main>
  );
}
