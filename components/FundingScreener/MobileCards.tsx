"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowUpRight, ChevronDown } from "lucide-react";
import { formatAPR, formatExchange } from "@/lib/formatters";
import { getRate, findArbPairPinned, buildBacktesterUrl, ArbPair } from "@/lib/funding";
import { isValidUrl } from "@/lib/validation";
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
  filteredColumns: (ExchangeColumn & { isGmxGroup?: boolean })[];
  gmxColumns: ExchangeColumn[];
  gmxOptionsByToken: Map<
    string,
    {
      columnKey: string;
      quote: string;
      side: "long" | "short" | null;
      market: FundingMatrixMarket;
      rate: number | null;
    }[]
  >;
  gmxColumnKeySet: Set<string>;
  getGmxSelectedKey: (
    token: string | null | undefined,
    options: { columnKey: string }[]
  ) => string | null;
  onSelectGmxKey: (token: string | null | undefined, key: string) => void;
  filteredColumnKeys: Set<string>;
  pinnedColumnKey: string | null;
  exchangesWithMultipleQuotes: Set<string>;
  onOpenModal?: (payload: {
    token: string;
    arbPair: ArbPair;
    maxArb: number | null;
  }) => void;
};

const formatColumnHeader = (
  col: ExchangeColumn,
  exchangesWithMultipleQuotes: Set<string>
) => {
  const name = formatExchange(col.exchange);
  if (col.exchange.toLowerCase() === "gmx") {
    return `${name} (${col.quote_asset})`;
  }
  if (exchangesWithMultipleQuotes.has(col.exchange)) {
    return `${name} (${col.quote_asset})`;
  }
  return name;
};

function ExchangeRateRow({
  label,
  market,
  rate,
  pinned,
  role,
  toggle,
}: {
  label: string;
  market: FundingMatrixMarket;
  rate: number | null;
  pinned: boolean;
  role?: "long" | "short";
  toggle?: React.ReactNode;
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
      {toggle}
    </span>
  );

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 ${
        pinned ? "ring-1 ring-[#FA814D]/70" : ""
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isValidUrl(market.ref_url) ? (
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

const formatGmxLabel = (market: FundingMatrixMarket, fallback: string) => {
  if (market.exchange.toLowerCase() !== "gmx") return fallback;
  return `${formatExchange(market.exchange)} (${market.quote})`;
};

export default function FundingScreenerMobileCards({
  rows,
  loading,
  timeWindow,
  filteredColumns,
  gmxColumns,
  gmxOptionsByToken,
  gmxColumnKeySet,
  getGmxSelectedKey,
  onSelectGmxKey,
  filteredColumnKeys,
  pinnedColumnKey,
  exchangesWithMultipleQuotes,
  onOpenModal,
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

  const gmxByToken = useMemo(() => {
    const map = new Map<string, FundingMatrixMarket | null>();
    if (gmxColumns.length === 0) return map;
    for (const row of rows) {
      if (!row.token) continue;
      const options = gmxOptionsByToken.get(row.token) ?? [];
      const selectedKey = getGmxSelectedKey(row.token, options);
      const selected =
        options.find((opt) => opt.columnKey === selectedKey) ?? options[0];
      map.set(row.token, selected?.market ?? null);
    }
    return map;
  }, [rows, gmxColumns, gmxOptionsByToken, getGmxSelectedKey]);

  const gmxOtherByToken = useMemo(() => {
    const map = new Map<
      string,
      {
        market: FundingMatrixMarket;
        columnKey: string;
        label: string;
        rate: number | null;
      }[]
    >();
    if (gmxColumns.length === 0) return map;

    for (const row of rows) {
      if (!row.token) continue;
      const options = gmxOptionsByToken.get(row.token) ?? [];
      const selectedKey = getGmxSelectedKey(row.token, options);
      const others = options
        .filter((opt) => opt.columnKey !== selectedKey)
        .map((opt) => ({
          market: opt.market,
          columnKey: opt.columnKey,
          label: `GMX (${opt.quote})${opt.side ? ` ${opt.side.toUpperCase()}` : ""}`,
          rate: opt.rate,
        }));
      map.set(row.token, others);
    }
    return map;
  }, [rows, gmxColumns, gmxOptionsByToken, getGmxSelectedKey]);

  const getPinnedKeyForRow = (row: FundingMatrixRow) => {
    if (!pinnedColumnKey) return null;
    if (!gmxColumnKeySet.has(pinnedColumnKey)) return pinnedColumnKey;
    const options = gmxOptionsByToken.get(row.token ?? "") ?? [];
    return getGmxSelectedKey(row.token, options) ?? pinnedColumnKey;
  };

  const getColumnKeysForRow = (row: FundingMatrixRow) => {
    if (gmxColumnKeySet.size === 0) return filteredColumnKeys;
    const next = new Set(filteredColumnKeys);
    for (const key of gmxColumnKeySet) {
      next.delete(key);
    }
    const options = gmxOptionsByToken.get(row.token ?? "") ?? [];
    const selectedKey = getGmxSelectedKey(row.token, options);
    if (selectedKey) {
      next.add(selectedKey);
    }
    return next;
  };

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
                const pinnedKey = getPinnedKeyForRow(row);
                const columnKeys = getColumnKeysForRow(row);
                const arbPair = findArbPairPinned(
                  row.markets,
                  timeWindow,
                  columnKeys,
                  pinnedKey
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
                  .map((col) => {
                    if (col.isGmxGroup) {
                      const market = row.token ? gmxByToken.get(row.token) ?? null : null;
                      return { col, market };
                    }
                    return {
                      col,
                      market: row.markets?.[col.column_key] ?? null,
                    };
                  })
                  .filter((entry) => entry.market);

                const usedKeys = new Set<string>();
                if (longKey) usedKeys.add(longKey);
                if (shortKey) usedKeys.add(shortKey);

                const remainingMarkets = availableMarkets.filter(
                  (entry) => !usedKeys.has(entry.col.column_key)
                );
                const gmxRemaining = row.token
                  ? gmxOtherByToken.get(row.token) ?? []
                  : [];

                const remainingCount = remainingMarkets.length + gmxRemaining.length;
                const isExpanded = expanded.has(token);
                const hasMore = remainingCount > 0;
                const hasHistory = !!historyUrl;
                const canOpenModal =
                  !!onOpenModal && !!arbPair && !!row.token;

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

                const handleOpenModal = () => {
                  if (!canOpenModal) return;
                  onOpenModal({
                    token: row.token!,
                    arbPair,
                    maxArb,
                  });
                };

                const cardClickable = !hasMore && canOpenModal;

                return (
                  <div
                    key={token}
                    role={cardClickable ? "button" : "group"}
                    tabIndex={cardClickable ? 0 : -1}
                    onClick={cardClickable ? handleOpenModal : undefined}
                    onKeyDown={(event) => {
                      if (!cardClickable) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleOpenModal();
                      }
                    }}
                    className="rounded-2xl border border-[#343a4e] bg-[#1c202f] p-3 text-xs text-gray-200 flex flex-col gap-3"
                  >
                    <div
                      className={`relative flex items-start justify-between gap-4 ${
                        hasMore && canOpenModal ? "cursor-pointer" : ""
                      }`}
                      onClick={
                        hasMore && canOpenModal ? handleOpenModal : undefined
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
                      {canOpenModal && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenModal();
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
                              label={formatGmxLabel(
                                longMarket,
                                columnLabelByKey.get(longKey) ??
                                  formatExchange(longMarket.exchange)
                              )}
                              market={longMarket}
                              rate={longRate}
                              pinned={pinnedKey === longKey}
                              role="long"
                              toggle={
                                longMarket.exchange.toLowerCase() === "gmx"
                                  ? (() => {
                                      const options = gmxOptionsByToken.get(row.token ?? "") ?? [];
                                      const current = options.find(
                                        (opt) => opt.market.market_id === longMarket.market_id
                                      );
                                      if (!current?.side) return null;
                                      const next = options.find(
                                        (opt) => opt.quote === current.quote && opt.side && opt.side !== current.side
                                      );
                                      if (!next) return null;
                                      return (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            onSelectGmxKey(row.token, next.columnKey);
                                          }}
                                          className="relative inline-flex h-4 w-8 items-center rounded-full border border-[#343a4e] bg-[#23283a] p-0.5 text-[9px] font-medium text-gray-400"
                                          title={current.side === "long" ? "Long rates" : "Short rates"}
                                        >
                                          <span className="relative z-10 grid w-full grid-cols-2">
                                            <span
                                              className={`text-center transition-colors ${
                                                current.side === "long"
                                                  ? "text-emerald-200"
                                                  : "text-gray-400"
                                              }`}
                                            >
                                              L
                                            </span>
                                            <span
                                              className={`text-center transition-colors ${
                                                current.side === "short"
                                                  ? "text-red-200"
                                                  : "text-gray-400"
                                              }`}
                                            >
                                              S
                                            </span>
                                          </span>
                                          <span
                                            className={`absolute left-0.5 top-1/2 h-3 w-[calc(50%-2px)] -translate-y-1/2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                              current.side === "long"
                                                ? "translate-x-0 bg-emerald-500/25"
                                                : "translate-x-full bg-red-500/25"
                                            }`}
                                          />
                                        </button>
                                      );
                                    })()
                                  : undefined
                              }
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            {shortMarket && shortKey ? (
                              <ExchangeRateRow
                                label={
                                  formatGmxLabel(
                                    shortMarket,
                                    columnLabelByKey.get(shortKey) ??
                                      formatExchange(shortMarket.exchange)
                                  )
                                }
                                market={shortMarket}
                                rate={shortRate}
                                pinned={pinnedKey === shortKey}
                                role="short"
                                toggle={
                                  shortMarket.exchange.toLowerCase() === "gmx"
                                    ? (() => {
                                        const options = gmxOptionsByToken.get(row.token ?? "") ?? [];
                                        const current = options.find(
                                          (opt) => opt.market.market_id === shortMarket.market_id
                                        );
                                        if (!current?.side) return null;
                                        const next = options.find(
                                          (opt) => opt.quote === current.quote && opt.side && opt.side !== current.side
                                        );
                                        if (!next) return null;
                                        return (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              onSelectGmxKey(row.token, next.columnKey);
                                            }}
                                            className="relative inline-flex h-4 w-8 items-center rounded-full border border-[#343a4e] bg-[#23283a] p-0.5 text-[9px] font-medium text-gray-400"
                                            title={current.side === "long" ? "Long rates" : "Short rates"}
                                          >
                                            <span className="relative z-10 grid w-full grid-cols-2">
                                              <span
                                                className={`text-center transition-colors ${
                                                  current.side === "long"
                                                    ? "text-emerald-200"
                                                    : "text-gray-400"
                                                }`}
                                              >
                                                L
                                              </span>
                                              <span
                                                className={`text-center transition-colors ${
                                                  current.side === "short"
                                                    ? "text-red-200"
                                                    : "text-gray-400"
                                                }`}
                                              >
                                                S
                                              </span>
                                            </span>
                                            <span
                                              className={`absolute left-0.5 top-1/2 h-3 w-[calc(50%-2px)] -translate-y-1/2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                                current.side === "long"
                                                  ? "translate-x-0 bg-emerald-500/25"
                                                  : "translate-x-full bg-red-500/25"
                                              }`}
                                            />
                                          </button>
                                        );
                                      })()
                                    : undefined
                                }
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
                              ? "max-h-[1200px] opacity-100 translate-y-0"
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
                              const isGmx = market.exchange.toLowerCase() === "gmx";
                              const gmxOptions = isGmx && row.token
                                ? gmxOptionsByToken.get(row.token) ?? []
                                : [];
                              const selectedKey = isGmx
                                ? getGmxSelectedKey(row.token, gmxOptions)
                                : null;
                              const selectedOption = isGmx
                                ? gmxOptions.find((opt) => opt.columnKey === selectedKey) ?? gmxOptions[0]
                                : null;
                              const hasOpposite = !!selectedOption?.side && gmxOptions.some(
                                (opt) => opt.quote === selectedOption.quote && opt.side && opt.side !== selectedOption.side
                              );
                              const toggle = isGmx && hasOpposite ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const next = gmxOptions.find(
                                      (opt) =>
                                        opt.quote === selectedOption?.quote &&
                                        opt.side &&
                                        opt.side !== selectedOption?.side
                                    );
                                    if (next) {
                                      onSelectGmxKey(row.token, next.columnKey);
                                    }
                                  }}
                                  className="relative inline-flex h-4 w-8 items-center rounded-full border border-[#343a4e] bg-[#23283a] p-0.5 text-[9px] font-medium text-gray-400"
                                  title={selectedOption?.side === "long" ? "Long rates" : "Short rates"}
                                >
                                  <span className="relative z-10 grid w-full grid-cols-2">
                                    <span
                                      className={`text-center transition-colors ${
                                        selectedOption?.side === "long"
                                          ? "text-emerald-200"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      L
                                    </span>
                                    <span
                                      className={`text-center transition-colors ${
                                        selectedOption?.side === "short"
                                          ? "text-red-200"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      S
                                    </span>
                                  </span>
                                  <span
                                    className={`absolute left-0.5 top-1/2 h-3 w-[calc(50%-2px)] -translate-y-1/2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                      selectedOption?.side === "long"
                                        ? "translate-x-0 bg-emerald-500/25"
                                        : "translate-x-full bg-red-500/25"
                                    }`}
                                  />
                                </button>
                              ) : undefined;

                              const label = isGmx && selectedOption
                                ? `GMX (${selectedOption.quote})`
                                : formatColumnHeader(col, exchangesWithMultipleQuotes);
                              const pinnedKey = getPinnedKeyForRow(row);
                              const pinned = isGmx
                                ? pinnedKey === selectedOption?.columnKey
                                : pinnedColumnKey === col.column_key;
                              return (
                                <ExchangeRateRow
                                  key={col.column_key}
                                  label={label}
                                  market={market}
                                  rate={rate}
                                  pinned={pinned}
                                  toggle={toggle}
                                />
                              );
                            })}
                            {gmxRemaining.map((entry) => (
                              <ExchangeRateRow
                                key={entry.columnKey}
                                label={entry.label}
                                market={entry.market}
                                rate={entry.rate}
                                pinned={false}
                              />
                            ))}
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
