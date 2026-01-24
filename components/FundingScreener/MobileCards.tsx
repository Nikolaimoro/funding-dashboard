"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowUpRight, ChevronDown } from "lucide-react";
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
  role,
}: {
  label: string;
  market: FundingMatrixMarket;
  rate: number | null;
  pinned: boolean;
  role?: "long" | "short";
}) {
  const rateClass =
    rate == null
      ? "text-gray-400"
      : rate < 0
        ? "text-emerald-400"
        : rate > 0
          ? "text-red-400"
          : "text-gray-300";

  const roleIndicator =
    role === "long" ? (
      <span className="inline-block w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-emerald-400" />
    ) : role === "short" ? (
      <span className="inline-block w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-red-400" />
    ) : null;

  const exchangeContent = (
    <span className="inline-flex items-center gap-2 min-w-0">
      <ExchangeIcon exchange={market.exchange} size={16} />
      <span className="truncate text-sm text-gray-100">{label}</span>
      {roleIndicator}
    </span>
  );

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 ${
        pinned ? "ring-1 ring-[#FA814D]/70" : ""
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
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
      </div>
      <span className={`font-mono text-sm ${rateClass}`}>
        {formatAPR(rate)}
      </span>
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
                const hasMore = remainingCount > 0;
                const hasHistory = !!historyUrl;

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

                const handleOpenChart = () => {
                  if (!historyUrl) return;
                  if (typeof window !== "undefined") {
                    window.open(historyUrl, "_blank", "noopener,noreferrer");
                  }
                };

                const cardClickable = !hasMore && hasHistory;

                return (
                  <div
                    key={token}
                    role={cardClickable ? "button" : "group"}
                    tabIndex={cardClickable ? 0 : -1}
                    onClick={cardClickable ? handleOpenChart : undefined}
                    onKeyDown={(event) => {
                      if (!cardClickable) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleOpenChart();
                      }
                    }}
                    className="rounded-2xl border border-[#343a4e] bg-[#1c202f] p-3 text-xs text-gray-200 flex flex-col gap-3"
                  >
                    <div
                      className={`relative flex items-start justify-between gap-4 ${
                        hasMore && hasHistory ? "cursor-pointer" : ""
                      }`}
                      onClick={
                        hasMore && hasHistory ? handleOpenChart : undefined
                      }
                    >
                      <span className="text-base font-mono text-white">
                        {row.token ?? "–"}
                      </span>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-gray-500 mr-1">
                          APR
                        </span>
                        <span className="text-base font-mono text-white">
                          {formatAPR(maxArb)}
                        </span>
                      </div>
                      {hasHistory && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenChart();
                          }}
                          className="absolute left-1/2 top-0 -translate-x-1/2 text-[10px] text-gray-500 inline-flex items-center gap-1"
                        >
                          View Chart
                          <ArrowUpRight size={10} />
                        </button>
                      )}
                    </div>

                    <div
                      className={`flex flex-col gap-3 ${
                        hasMore ? "cursor-pointer" : ""
                      }`}
                      onClick={hasMore ? toggleExpanded : undefined}
                    >
                      {longMarket && longKey ? (
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex flex-col gap-1">
                            <ExchangeRateRow
                              label={
                                columnLabelByKey.get(longKey) ??
                                formatExchange(longMarket.exchange)
                              }
                              market={longMarket}
                              rate={longRate}
                              pinned={pinnedColumnKey === longKey}
                              role="long"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            {shortMarket && shortKey ? (
                              <ExchangeRateRow
                                label={
                                  columnLabelByKey.get(shortKey) ??
                                  formatExchange(shortMarket.exchange)
                                }
                                market={shortMarket}
                                rate={shortRate}
                                pinned={pinnedColumnKey === shortKey}
                                role="short"
                              />
                            ) : (
                              <div className="text-xs text-gray-500">
                                No short
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">No APR pair</div>
                      )}
                    </div>

                    {hasMore && (
                      <div className="flex flex-col gap-2">
                        <div
                          className={`overflow-hidden rounded-lg transition-[max-height,opacity,transform] duration-500 ease-in-out ${
                            isExpanded
                              ? "max-h-96 opacity-100 translate-y-0"
                              : "max-h-0 opacity-0 translate-y-2"
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (isExpanded) {
                              toggleExpanded();
                            }
                          }}
                        >
                          <div className="flex flex-col gap-3 pb-2">
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
                                />
                              );
                            })}
                          </div>
                        </div>

                        <div
                          className="relative flex items-center justify-center text-xs text-gray-400"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleExpanded();
                          }}
                        >
                          <span className="text-center">
                            {isExpanded
                              ? "Less exchanges"
                              : `${remainingCount} more exchanges`}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`absolute right-0 transition-transform duration-300 ${
                              isExpanded ? "rotate-180 translate-y-1" : ""
                            }`}
                          />
                        </div>
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
