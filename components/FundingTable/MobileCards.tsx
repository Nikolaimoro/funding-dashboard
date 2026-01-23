"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { FundingRow } from "@/lib/types";
import { formatAPR, formatCompactUSD, formatExchange } from "@/lib/formatters";
import ExchangeIcon from "@/components/ui/ExchangeIcon";

const MOBILE_PAGE_SIZE = 20;

type Props = {
  rows: FundingRow[];
  loading: boolean;
  onOpenChart: (row: FundingRow) => void;
};

const formatAPRText = (value: number | null) => formatAPR(value);

export default function FundingMobileCards({
  rows,
  loading,
  onOpenChart,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(MOBILE_PAGE_SIZE);
  const [fetchingMore, setFetchingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

  return (
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
      ) : rows.length === 0 ? (
        <div className="text-gray-400 text-sm py-6 text-center">
          No results for the current filters.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3">
            {rows.slice(0, visibleCount).map((row) => (
              <div
                key={`${row.exchange}:${row.market}`}
                role="button"
                tabIndex={0}
                onClick={() => onOpenChart(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenChart(row);
                  }
                }}
                className="rounded-2xl border border-[#343a4e] bg-[#1c202f] p-4 text-xs text-gray-200 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {row.ref_url ? (
                      <a
                        href={row.ref_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="text-base font-mono text-white inline-flex items-center gap-2 hover:underline"
                      >
                        <span className="truncate">{row.market}</span>
                        <ExternalLink size={12} className="text-gray-400" />
                      </a>
                    ) : (
                      <span className="text-base font-mono text-white inline-flex items-center gap-2">
                        <span className="truncate">{row.market}</span>
                        <ExternalLink size={12} className="text-gray-600" />
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white inline-flex items-center gap-1.5">
                    <ExchangeIcon exchange={row.exchange} size={16} />
                    {formatExchange(row.exchange)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                  {(
                    ["now", "1d", "3d", "7d", "15d", "30d"] as const
                  ).map((label) => {
                    const value =
                      label === "now"
                        ? formatAPRText(row.funding_rate_now)
                        : formatAPRText(row[label]);
                    return (
                      <div key={label} className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-500 uppercase">
                          {label === "now" ? "Now" : label}
                        </span>
                        <span
                          className={`font-mono ${
                            label === "now"
                              ? "text-base text-white"
                              : "text-sm text-gray-200"
                          }`}
                        >
                          {value}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-[#343a4e] bg-[#23283a] px-3 py-2">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500 uppercase">
                        OI
                      </span>
                      <span className="text-sm font-mono text-white">
                        {formatCompactUSD(row.open_interest)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="text-[10px] text-gray-500 uppercase">
                        Vol 24h
                      </span>
                      <span className="text-sm font-mono text-white">
                        {formatCompactUSD(row.volume_24h)}
                      </span>
                    </div>
                  </div>
                </div>

                {row.market_id && (
                  <div className="flex justify-end">
                    <span className="text-[10px] text-gray-500 inline-flex items-center gap-1">
                      View Chart
                      <ArrowUpRight size={10} />
                    </span>
                  </div>
                )}
              </div>
            ))}
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
  );
}
