"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowUpRight, ChevronDown, ChevronUp, Pin } from "lucide-react";
import { formatAPR, formatExchange } from "@/lib/formatters";
import { getRate, findArbPair, ArbPair } from "@/lib/funding";
import {
  ExchangeColumn,
  FundingMatrixMarket,
  FundingMatrixRow,
  TimeWindow,
} from "@/lib/types";
import ExchangeIcon from "@/components/ui/ExchangeIcon";

const MOBILE_PAGE_SIZE = 20;

type Props = {
  rows: FundingMatrixRow[];
  loading: boolean;
  timeWindow: TimeWindow;
  filteredColumns: ExchangeColumn[];
  filteredColumnKeys: Set<string>;
  pinnedColumnKey: string | null;
  onTogglePinned: (columnKey: string | null) => void;
  exchangesWithMultipleQuotes: Set<string>;
};

const formatColumnHeader = (
  col: ExchangeColumn,
  exchangesWithMultipleQuotes: Set<string>
) => {
  const name = formatExchange(col.exchange);
  if (exchangesWithMultipleQuotes.has(col.exchange)) {
    return `${name} (${col.quote_asset})`;
  }
  return name;
};

const buildBacktesterUrl = (token: string, arbPair: ArbPair | null) => {
  if (!arbPair) return null;
  const longExchange = arbPair.longMarket.exchange;
  const shortExchange = arbPair.shortMarket.exchange;
  const longQuote = arbPair.longMarket.quote;
  const shortQuote = arbPair.shortMarket.quote;
  if (!longExchange || !shortExchange || !longQuote || !shortQuote) return null;
  const exchange1 = `${longExchange}${String(longQuote).toLowerCase()}`;
  const exchange2 = `${shortExchange}${String(shortQuote).toLowerCase()}`;
  return `/backtester?token=${encodeURIComponent(token)}&exchange1=${encodeURIComponent(exchange1)}&exchange2=${encodeURIComponent(exchange2)}`;
};

function findArbPairPinned(
  markets: Record<string, FundingMatrixMarket> | null | undefined,
  timeWindow: TimeWindow,
  selectedColumnKeys: Set<string>,
  pinnedKey: string | null
): ArbPair | null {
  if (!markets) return null;
  if (!pinnedKey) return findArbPair(markets, timeWindow, selectedColumnKeys);
  if (!selectedColumnKeys.has(pinnedKey))
    return findArbPair(markets, timeWindow, selectedColumnKeys);

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

function ExchangeRateRow({
  label,
  market,
  rate,
  pinned,
  onTogglePinned,
}: {
  label: string;
  market: FundingMatrixMarket;
  rate: number | null;
  pinned: boolean;
  onTogglePinned: () => void;
}) {
  const exchangeContent = (
    <span className="inline-flex items-center gap-2 min-w-0">
      <ExchangeIcon exchange={market.exchange} size={14} />
      <span className="truncate">{label}</span>
    </span>
  );

  return (
    <div className="flex items-center justify-between gap-3 text-xs text-gray-200">
      {market.ref_url ? (
        <a
          href={market.ref_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="min-w-0"
        >
          {exchangeContent}
        </a>
      ) : (
        exchangeContent
      )}
      <div className="flex items-center gap-2">
        <span className="font-mono text-white">{formatAPR(rate)}</span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onTogglePinned();
          }}
          className={`inline-flex items-center ${
            pinned ? "text-[#FA814D]" : "text-gray-500 hover:text-gray-300"
          }`}
          aria-label={pinned ? "Unpin exchange" : "Pin exchange"}
          title={pinned ? "Unpin" : "Pin"}
        >
          <Pin size={12} />
        </button>
      </div>
    </div>
  );
}

export default function FundingScreenerMobileCards({
  rows,
  loading,
  timeWindow,
  filteredColumns,
  filteredColumnKeys,
  pinnedColumnKey,
  onTogglePinned,
  exchangesWithMultipleQuotes,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(MOBILE_PAGE_SIZE);
  const [fetchingMore, setFetchingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVisibleCount(MOBILE_PAGE_SIZE);
    setFetchingMore(false);
  }, [rows]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    if (visibleCount >= rows.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (fetchingMore) return;
        setFetchingMore(true);
        setTimeout(() => {
          setVisibleCount((prev) =>
            Math.min(prev + MOBILE_PAGE_SIZE, rows.length)
          );
          setFetchingMore(false);
        }, 250);
      },
      { rootMargin: "200px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [rows.length, visibleCount, fetchingMore]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const visibleRows = rows.slice(0, visibleCount);

  const columnLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of filteredColumns) {
      map.set(
        col.column_key,
        formatColumnHeader(col, exchangesWithMultipleQuotes)
      );
    }
    return map;
  }, [filteredColumns, exchangesWithMultipleQuotes]);

  return (
    <>
      <div className="min-[960px]:hidden px-4 pb-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-44 rounded-2xl bg-[#1c202f] border border-[#343a4e] animate-pulse"
              />
            ))}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="text-gray-400 text-sm py-6 text-center">
            No tokens found
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3">
              {visibleRows.map((row, idx) => {
                const token = row.token ?? `token-${idx}`;
                const arbPair = findArbPairPinned(
                  row.markets,
                  timeWindow,
                  filteredColumnKeys,
                  pinnedColumnKey
                );
                const maxArb = arbPair ? arbPair.spread : null;
                const historyUrl = row.token
                  ? buildBacktesterUrl(row.token, arbPair)
                  : null;
                const longMarket = arbPair?.longMarket ?? null;
                const shortMarket = arbPair?.shortMarket ?? null;
                const longRate = arbPair?.longRate ?? null;
                const shortRate = arbPair?.shortRate ?? null;
                const longKey = arbPair?.longKey ?? null;
                const shortKey = arbPair?.shortKey ?? null;

                const availableMarkets = filteredColumns
                  .map((col) => ({
                    col,
                    market: row.markets?.[col.column_key] ?? null,
                  }))
                  .filter((entry) => entry.market);

                const usedKeys = new Set<string>();
                if (longKey) usedKeys.add(longKey);
                if (shortKey) usedKeys.add(shortKey);

                const remainingMarkets = availableMarkets.filter(
                  (entry) => !usedKeys.has(entry.col.column_key)
                );

                const remainingCount = remainingMarkets.length;
                const isExpanded = expanded.has(token);

                const toggleExpanded = () => {
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(token)) {
                      next.delete(token);
                    } else {
                      next.add(token);
                    }
                    return next;
                  });
                };

                return (
                  <div
                    key={token}
                    role="button"
                    tabIndex={0}
                    onClick={toggleExpanded}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleExpanded();
                      }
                    }}
                    className="rounded-2xl border border-[#343a4e] bg-[#1c202f] p-4 text-xs text-gray-200 flex flex-col gap-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-base font-mono text-white">
                        {row.token ?? "–"}
                      </span>
                      <span
                        className={`text-base font-mono ${
                          maxArb != null && maxArb > 0
                            ? "text-emerald-400"
                            : "text-gray-400"
                        }`}
                      >
                        {formatAPR(maxArb)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {longMarket && longKey ? (
                        <ExchangeRateRow
                          label={
                            columnLabelByKey.get(longKey) ??
                            formatExchange(longMarket.exchange)
                          }
                          market={longMarket}
                          rate={longRate}
                          pinned={pinnedColumnKey === longKey}
                          onTogglePinned={() =>
                            onTogglePinned(
                              pinnedColumnKey === longKey ? null : longKey
                            )
                          }
                        />
                      ) : (
                        <div className="text-xs text-gray-500">No APR pair</div>
                      )}
                      {shortMarket && shortKey && (
                        <ExchangeRateRow
                          label={
                            columnLabelByKey.get(shortKey) ??
                            formatExchange(shortMarket.exchange)
                          }
                          market={shortMarket}
                          rate={shortRate}
                          pinned={pinnedColumnKey === shortKey}
                          onTogglePinned={() =>
                            onTogglePinned(
                              pinnedColumnKey === shortKey ? null : shortKey
                            )
                          }
                        />
                      )}
                    </div>

                    {historyUrl && (
                      <a
                        href={historyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] text-gray-500 self-end"
                      >
                        View Chart
                        <ArrowUpRight size={10} />
                      </a>
                    )}

                    <div className="rounded-xl border border-[#343a4e] bg-[#23283a] px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>
                          {remainingCount} more exchanges
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </div>
                    </div>

                    {isExpanded && remainingMarkets.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {remainingMarkets.map(({ col, market }) => {
                          if (!market) return null;
                          const rate = getRate(market, timeWindow);
                          return (
                            <ExchangeRateRow
                              key={col.column_key}
                              label={formatColumnHeader(
                                col,
                                exchangesWithMultipleQuotes
                              )}
                              market={market}
                              rate={rate}
                              pinned={pinnedColumnKey === col.column_key}
                              onTogglePinned={() =>
                                onTogglePinned(
                                  pinnedColumnKey === col.column_key
                                    ? null
                                    : col.column_key
                                )
                              }
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {fetchingMore && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-44 rounded-2xl bg-[#1c202f] border border-[#343a4e] animate-pulse"
                  />
                ))}
              </div>
            )}

            <div ref={loadMoreRef} className="h-6" />

            {visibleCount >= rows.length && rows.length > 0 && (
              <div className="text-center text-gray-400 text-xs py-4">
                No more results
              </div>
            )}
          </>
        )}
      </div>

      {showBackToTop && (
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="min-[960px]:hidden fixed bottom-24 right-4 z-40 rounded-full bg-[#1c202f] border border-[#343a4e] text-gray-200 p-2 shadow-lg"
          aria-label="Back to top"
        >
          <ArrowUp size={16} />
        </button>
      )}
    </>
  );
}
