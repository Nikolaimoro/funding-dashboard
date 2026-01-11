"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

/* chart — client only */
const FundingChart = dynamic(() => import("@/components/FundingChart"), {
  ssr: false,
});

/* ================= TYPES ================= */

export type Row = {
  market_id: number | null;
  exchange: string;
  symbol: string;
  market: string;
  ref_url: string | null;

  "1d": number | null;
  "3d": number | null;
  "7d": number | null;
  "15d": number | null;
  "30d": number | null;

  updated: string;
};

export type SortKey =
  | "exchange"
  | "market"
  | "1d"
  | "3d"
  | "7d"
  | "15d"
  | "30d";

export type SortDir = "asc" | "desc";

type ChartPoint = {
  funding_time: string;
  apr: number;
};

type Props = {
  rows: Row[];
  totalCount: number;
  page: number; // 0-based
  limit: number;
  sortKey: SortKey;
  sortDir: SortDir;
  search: string;
  exchanges: string[]; // selected exchanges (filter)
};

/* ================= CONSTS ================= */

const EXCHANGE_LABEL: Record<string, string> = {
  bybit: "Bybit",
  mexc: "MEXC",
  bingx: "BingX",
  paradex: "Paradex",
};

const formatExchange = (ex: string) => EXCHANGE_LABEL[ex] ?? ex;

/* ================= UI ================= */

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1 text-left select-none"
    >
      <span
        className={`transition-colors ${
          active ? "text-gray-200" : "text-gray-400 group-hover:text-gray-200"
        }`}
      >
        {label}
      </span>

      {!active && (
        <span className="text-xs opacity-0 group-hover:opacity-60 transition-opacity text-gray-500">
          ↑↓
        </span>
      )}

      {active && (
        <span className="text-[13px] text-blue-400">
          {dir === "asc" ? "↑" : "↓"}
        </span>
      )}
    </button>
  );
}

/* ================= COMPONENT ================= */

export default function FundingTable(props: Props) {
  const {
    rows,
    totalCount,
    page,
    limit,
    sortKey,
    sortDir,
    search,
    exchanges: selectedExchanges,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [filterOpen, setFilterOpen] = useState(false);

  /* локальное поле поиска (чтобы не дергать роутер на каждый символ) */
  const [searchDraft, setSearchDraft] = useState(search ?? "");

  useEffect(() => {
    setSearchDraft(search ?? "");
  }, [search]);

  /* ---------- helpers ---------- */
  const formatAPR = (v: number | null) =>
    v == null || Number.isNaN(v) ? (
      <span className="text-gray-600">–</span>
    ) : (
      <span className="text-gray-300 font-mono tabular-nums">
        {v.toFixed(2)}%
      </span>
    );

  const setParams = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(sp?.toString());

      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === "") params.delete(k);
        else params.set(k, String(v));
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp]
  );

  const totalPages =
    limit === -1 ? 1 : Math.max(1, Math.ceil(totalCount / limit));

  /* ---------- exchanges list (for filter dropdown) ---------- */
  const exchangeOptions = useMemo(() => {
    return Array.from(new Set(rows.map(r => r.exchange))).sort();
  }, [rows]);

  const toggleExchange = (ex: string) => {
    const set = new Set(selectedExchanges ?? []);
    if (set.has(ex)) set.delete(ex);
    else set.add(ex);

    setParams({
      exchanges: Array.from(set).join(","),
      page: 0,
    });
  };

  /* ---------- sorting ---------- */
  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setParams({ dir: sortDir === "asc" ? "desc" : "asc", page: 0 });
    } else {
      setParams({ sort: key, dir: "desc", page: 0 });
    }
  };

  /* ---------- search (debounced) ---------- */
  useEffect(() => {
    const t = setTimeout(() => {
      const q = searchDraft.trim();
      setParams({ q, page: 0 });
    }, 250);

    return () => clearTimeout(t);
  }, [searchDraft, setParams]);

  /* ---------- limit ---------- */
  const onLimitChange = (v: number) => {
    setParams({ limit: v, page: 0 });
  };

  /* ---------- pagination ---------- */
  const goPage = (p: number) => {
    const clamped = Math.max(0, Math.min(totalPages - 1, p));
    setParams({ page: clamped });
  };

  /* ---------- chart ---------- */
  const [chartMarket, setChartMarket] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartCache, setChartCache] = useState<Record<number, ChartPoint[]>>(
    {}
  );

  useEffect(() => {
    if (!chartMarket?.id) return;

    const cached = chartCache[chartMarket.id];
    if (cached) {
      setChartData(cached);
      setChartError(null);
      return;
    }

    setChartLoading(true);
    setChartError(null);

    supabase
      .rpc("get_funding_chart", { p_market_id: chartMarket.id })
      .then(({ data, error }) => {
        if (error) {
          console.error("Funding chart error:", error);
          setChartError("Failed to load funding history. Please try again.");
          setChartData([]);
        } else {
          const points = (data ?? []) as ChartPoint[];
          setChartData(points);
          setChartCache(p => ({ ...p, [chartMarket.id!]: points }));
        }
        setChartLoading(false);
      });
  }, [chartMarket, chartCache]);

  /* ================= RENDER ================= */

  return (
    <main className="min-h-screen bg-gray-900 p-6 text-gray-200">
      <h1 className="text-2xl font-semibold mb-4">Funding Rates Dashboard</h1>

      {/* ---------- Controls ---------- */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
          placeholder="Search market"
          value={searchDraft}
          onChange={e => setSearchDraft(e.target.value)}
        />

        <div className="relative">
          <button
            onClick={() => setFilterOpen(v => !v)}
            className="bg-gray-800 border border-gray-700 px-3 py-2 rounded text-sm hover:border-gray-600 transition"
          >
            Exchanges
            {selectedExchanges.length > 0 && (
              <span className="text-blue-400 ml-1">
                ({selectedExchanges.length})
              </span>
            )}
          </button>

          {filterOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setFilterOpen(false)}
              />
              <div className="absolute z-20 mt-2 bg-gray-800 border border-gray-700 rounded w-56 p-2 shadow-lg">
                {exchangeOptions.map(ex => (
                  <label
                    key={ex}
                    className="flex gap-2 px-2 py-1 cursor-pointer hover:bg-gray-700 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedExchanges.includes(ex)}
                      onChange={() => toggleExchange(ex)}
                    />
                    {formatExchange(ex)}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---------- Table ---------- */}
      <div className="overflow-auto rounded border border-gray-800 bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 sticky top-0">
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left">
                <SortableHeader
                  label="Exchange"
                  active={sortKey === "exchange"}
                  dir={sortDir}
                  onClick={() => onSort("exchange")}
                />
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader
                  label="Market"
                  active={sortKey === "market"}
                  dir={sortDir}
                  onClick={() => onSort("market")}
                />
              </th>
              <th className="px-4 py-3 text-center">History</th>

              {(["1d", "3d", "7d", "15d", "30d"] as SortKey[]).map(h => (
                <th key={h} className="px-4 py-3 text-right">
                  <SortableHeader
                    label={h}
                    active={sortKey === h}
                    dir={sortDir}
                    onClick={() => onSort(h)}
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map(r => (
              <tr
                key={`${r.exchange}:${r.market}`}
                className="border-b border-gray-800 hover:bg-gray-700/40"
              >
                <td className="px-4 py-2">{formatExchange(r.exchange)}</td>

                <td className="px-4 py-2 font-mono font-semibold">
                  {r.ref_url ? (
                    <a
                      href={r.ref_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 hover:underline"
                    >
                      {r.market}
                    </a>
                  ) : (
                    r.market
                  )}
                </td>

                <td className="px-4 py-2 text-center">
                  {r.market_id && (
                    <button
                      onClick={() =>
                        setChartMarket({
                          id: r.market_id!,
                          title: `${formatExchange(r.exchange)} · ${r.market}`,
                        })
                      }
                      className="text-blue-300 hover:text-blue-200"
                    >
                      📈
                    </button>
                  )}
                </td>

                <td className="px-4 py-2 text-right">{formatAPR(r["1d"])}</td>
                <td className="px-4 py-2 text-right">{formatAPR(r["3d"])}</td>
                <td className="px-4 py-2 text-right">{formatAPR(r["7d"])}</td>
                <td className="px-4 py-2 text-right">{formatAPR(r["15d"])}</td>
                <td className="px-4 py-2 text-right">{formatAPR(r["30d"])}</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Pagination ---------- */}
      <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <span>
            Showing{" "}
            {limit === -1
              ? totalCount
              : Math.min(totalCount, page * limit + rows.length)}{" "}
            / {totalCount}
          </span>

          <span className="opacity-40">•</span>

          <span>Rows:</span>
          <select
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
            value={limit}
            onChange={e => onLimitChange(Number(e.target.value))}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={-1}>All</option>
          </select>
        </div>

        {limit !== -1 && totalPages > 1 && (
          <div className="flex gap-2 items-center">
            <button
              onClick={() => goPage(0)}
              disabled={page === 0}
              className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
            >
              First
            </button>

            <button
              onClick={() => goPage(page - 1)}
              disabled={page === 0}
              className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
            >
              Prev
            </button>

            <span className="px-2 min-w-[64px] text-center tabular-nums text-gray-300">
              {page + 1} / {totalPages}
            </span>

            <button
              onClick={() => goPage(page + 1)}
              disabled={page + 1 >= totalPages}
              className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
            >
              Next
            </button>

            <button
              onClick={() => goPage(totalPages - 1)}
              disabled={page + 1 >= totalPages}
              className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
            >
              Last
            </button>
          </div>
        )}
      </div>

      {/* ---------- Modal ---------- */}
      {chartMarket && (
        <div
          className="fixed inset-0 z-50 backdrop-blur-md transition-[backdrop-filter] duration-300 ease-out"
          onClick={() => setChartMarket(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-lg p-6
                       w-[900px] max-w-[95vw] h-[520px]
                       mx-auto mt-24 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="mb-4">{chartMarket.title}</h2>

            <div className="flex-1 flex items-center justify-center">
              {chartLoading && <div className="text-gray-400">Loading…</div>}

              {!chartLoading && chartError && (
                <div className="text-red-400 text-center max-w-md">
                  {chartError}
                </div>
              )}

              {!chartLoading && !chartError && chartData.length > 0 && (
                <FundingChart data={chartData} />
              )}

              {!chartLoading && !chartError && chartData.length === 0 && (
                <div className="text-gray-500">No chart data</div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}