"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { ArbRow } from "@/lib/types";
import { formatCompactUSD, formatExchange } from "@/lib/formatters";
import ExchangeIcon from "@/components/ui/ExchangeIcon";

const MOBILE_PAGE_SIZE = 20;

type Props = {
  rows: ArbRow[];
  loading: boolean;
  onOpenChart: (row: ArbRow) => void;
  pinnedExchanges: Set<string>;
};

const getStabilityColor = (value: number | null) => {
  if (value == null) return "bg-gray-500";
  if (value >= 0.8) return "bg-emerald-400";
  if (value >= 0.5) return "bg-orange-400";
  return "bg-red-400";
};

export default function ArbitrageMobileCards({
  rows,
  loading,
  onOpenChart,
  pinnedExchanges,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(MOBILE_PAGE_SIZE);
  const [fetchingMore, setFetchingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    setVisibleCount(MOBILE_PAGE_SIZE);
    setFetchingMore(false);
  }, [rows]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  return (
    <>
      <div className="min-[960px]:hidden px-4 pb-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="h-40 rounded-2xl bg-[#1c202f] border border-[#343a4e] animate-pulse"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-gray-400 text-sm py-6 text-center">
            No opportunities for this filter.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {rows.slice(0, visibleCount).map((row) => {
                const isLongPinned = pinnedExchanges.has(row.long_exchange);
                const isShortPinned = pinnedExchanges.has(row.short_exchange);
                return (
                  <div
                    key={`${row.base_asset}-${row.long_market_id}-${row.short_market_id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onOpenChart(row);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenChart(row);
                      }
                    }}
                    className="rounded-2xl border border-[#343a4e] bg-[#1c202f] p-4 text-xs text-gray-200 flex flex-col gap-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-sm">
                        {row.base_asset}
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-white">
                          {row.apr_spread != null
                            ? `${row.apr_spread.toFixed(2)}%`
                            : "–"}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          APR 15d
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <a
                        href={row.long_url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-green-400 border-green-500/30 text-[11px] ${
                          isLongPinned ? "ring-1 ring-[#FA814D]/60" : ""
                        }`}
                      >
                        <span className="text-[10px] uppercase">Long</span>
                        <span className="ml-1 inline-flex items-center gap-1">
                          <ExchangeIcon exchange={row.long_exchange} size={14} />
                          {formatExchange(row.long_exchange)}
                        </span>
                      </a>
                      <a
                        href={row.short_url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-red-400 border-red-500/30 text-[11px] ${
                          isShortPinned ? "ring-1 ring-[#FA814D]/60" : ""
                        }`}
                      >
                        <span className="text-[10px] uppercase">Short</span>
                        <span className="ml-1 inline-flex items-center gap-1">
                          <ExchangeIcon exchange={row.short_exchange} size={14} />
                          {formatExchange(row.short_exchange)}
                        </span>
                      </a>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <div className="flex flex-col">
                        <span>OI</span>
                        <span className="text-gray-200 font-mono leading-tight">
                          {formatCompactUSD(row.long_open_interest)}
                        </span>
                        <span className="text-gray-200 font-mono leading-tight">
                          {formatCompactUSD(row.short_open_interest)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end text-right">
                        <span>Vol 24h</span>
                        <span className="text-gray-200 font-mono leading-tight">
                          {formatCompactUSD(row.long_volume_24h)}
                        </span>
                        <span className="text-gray-200 font-mono leading-tight">
                          {formatCompactUSD(row.short_volume_24h)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <div className="flex items-center gap-2">
                        <span>Stability</span>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${getStabilityColor(row.stability)}`}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 inline-flex items-center gap-1">
                        View Chart
                        <ArrowUpRight size={10} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {fetchingMore && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-40 rounded-2xl bg-[#1c202f] border border-[#343a4e] animate-pulse"
                  />
                ))}
              </div>
            )}

            <div ref={loadMoreRef} className="h-6" />

            {visibleCount >= rows.length && rows.length > 0 && (
              <div className="text-center text-gray-400 text-xs py-4">
                No more opportunities
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
