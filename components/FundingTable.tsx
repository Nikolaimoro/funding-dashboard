"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";

/* chart — client only */
const FundingChart = dynamic(() => import("@/components/FundingChart"), {
  ssr: false,
});

/* ================= TYPES ================= */

type Row = {
  market_id: number | null;
  exchange: string;
  symbol: string;
  market: string;
  ref_url: string | null;

  open_interest: number | null;
  volume_24h: number | null;
  funding_rate_now: number | null;

  "1d": number | null;
  "3d": number | null;
  "7d": number | null;
  "15d": number | null;
  "30d": number | null;

  updated: string;
};

type SortKey =
  | "exchange"
  | "market"
  | "funding_rate_now"
  | "open_interest"
  | "volume_24h"
  | "1d"
  | "3d"
  | "7d"
  | "15d"
  | "30d"

type SortDir = "asc" | "desc";

type ChartPoint = {
  funding_time: string;
  apr: number;
};

/* ================= CONSTS ================= */

const EXCHANGE_LABEL: Record<string, string> = {
  bybit: "Bybit",
  mexc: "MEXC",
  bingx: "BingX",
  paradex: "Paradex",
  binance: "Binance",
  hyperliquid: "Hyperliquid"
};

const formatExchange = (ex: string) => EXCHANGE_LABEL[ex] ?? ex;

const MULTIPLIERS = ["1000000", "100000", "10000", "1000", "100", "10"] as const;

function normalizeSymbol(s: string): string {
  let x = (s ?? "").toUpperCase().trim();

  // убираем только "кратные 1000" слева
  for (const m of MULTIPLIERS) {
    while (x.startsWith(m)) x = x.slice(m.length);
  }

  // и справа
  for (const m of MULTIPLIERS) {
    while (x.endsWith(m)) x = x.slice(0, -m.length);
  }

  return x;
}

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

export default function FundingTable({ rows }: { rows: Row[] }) {
  /* ---------- state ---------- */
  const [search, setSearch] = useState("");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("volume_24h");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(0);

  /* ---------- chart ---------- */
  const [chartMarket, setChartMarket] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartCache, setChartCache] = useState<Record<number, ChartPoint[]>>({});

  /* ---------- reset page ---------- */
  useEffect(() => {
    setPage(0);
  }, [search, selectedExchanges, limit, sortKey, sortDir]);

  /* ---------- exchanges ---------- */
  const exchanges = useMemo(
    () => Array.from(new Set(rows.map(r => r.exchange))).sort(),
    [rows]
  );

  const toggleExchange = (ex: string) => {
    setSelectedExchanges(prev =>
      prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex]
    );
  };

  /* ---------- helpers ---------- */

const compactUSD = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatCompactUSD = (v: number | null) =>
  v == null || Number.isNaN(v) ? (
    <span className="text-gray-600">–</span>
  ) : (
    <span className="text-gray-300 font-mono tabular-nums">
      ${compactUSD.format(v)}
    </span>
  );

  const formatAPR = (v: number | null) =>
    v == null || Number.isNaN(v) ? (
      <span className="text-gray-600">–</span>
    ) : (
      <span className="text-gray-300 font-mono tabular-nums">
        {v.toFixed(2)}%
      </span>
    );

  const formatUSD = (v: number | null) =>
  v == null || Number.isNaN(v) ? (
    <span className="text-gray-600">–</span>
  ) : (
    <span className="text-gray-300 font-mono tabular-nums">
      ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
    </span>
  );  

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  /* ---------- filtering + sorting (ALL rows) ---------- */
  const sortedAll = useMemo(() => {
    let data = rows;

    const qRaw = search.trim();
    if (qRaw) {
      const q = normalizeSymbol(qRaw);
      data = data.filter(r => normalizeSymbol(r.market).startsWith(q));
    }

    if (selectedExchanges.length) {
      const set = new Set(selectedExchanges);
      data = data.filter(r => set.has(r.exchange));
    }

    const dir = sortDir === "asc" ? 1 : -1;

    return [...data].sort((a, b) => {
      const ak = a[sortKey as keyof Row];
      const bk = b[sortKey as keyof Row];

      if (sortKey === "exchange") {
        return (
          formatExchange(String(ak)).localeCompare(
            formatExchange(String(bk))
          ) * dir
        );
      }

      if (sortKey === "market") {
        return String(ak).localeCompare(String(bk)) * dir;
      }

      const av = typeof ak === "number" ? ak : null;
      const bv = typeof bk === "number" ? bk : null;

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [rows, search, selectedExchanges, sortKey, sortDir]);

  /* ---------- pagination ---------- */
  const totalPages =
    limit === -1 ? 1 : Math.max(1, Math.ceil(sortedAll.length / limit));

  const visible = useMemo(() => {
    if (limit === -1) return sortedAll;
    const start = page * limit;
    return sortedAll.slice(start, start + limit);
  }, [sortedAll, limit, page]);

  /* ---------- chart loading + cache ---------- */
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
          setChartError(
            "Failed to load funding history. Please try again."
          );
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
      <h1 className="text-2xl font-semibold mb-4">
        Funding Rates Dashboard
      </h1>

      {/* ---------- Controls ---------- */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
          placeholder="Search market"
          value={search}
          onChange={e => setSearch(e.target.value)}
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
                {exchanges.map(ex => (
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
              
<th className="px-4 py-3 text-right">
  <SortableHeader
    label="Open Interest"
    active={sortKey === "open_interest"}
    dir={sortDir}
    onClick={() => onSort("open_interest")}
  />
</th>

<th className="px-4 py-3 text-right">
  <SortableHeader
    label="Volume 24h"
    active={sortKey === "volume_24h"}
    dir={sortDir}
    onClick={() => onSort("volume_24h")}
  />
</th>

<th className="px-4 py-3 text-right">
  <SortableHeader
    label="Now"
    active={sortKey === "funding_rate_now"}
    dir={sortDir}
    onClick={() => onSort("funding_rate_now")}
  />
</th>

              {(["1d","3d","7d","15d","30d"] as SortKey[]).map(h => (
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
            {visible.map(r => (
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

<td className="px-4 py-2 text-right">
  {formatCompactUSD(r.open_interest)}
</td>

<td className="px-4 py-2 text-right">
  {formatCompactUSD(r.volume_24h)}
</td>

<td className="px-4 py-2 text-right">
  {formatAPR(r.funding_rate_now)}
</td>

                <td className="px-4 py-2 text-right">{formatAPR(r["1d"])}</td>
                <td className="px-4 py-2 text-right">{formatAPR(r["3d"])}</td>
                <td className="px-4 py-2 text-right">{formatAPR(r["7d"])}</td>
                <td className="px-4 py-2 text-right">{formatAPR(r["15d"])}</td>
                <td className="px-4 py-2 text-right">{formatAPR(r["30d"])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- Pagination ---------- */}
      <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
        <div>
          Rows:
          <select
            className="ml-2 bg-gray-800 border border-gray-700 rounded px-2 py-1"
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
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
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
            >
              First
            </button>

            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
            >
              Prev
            </button>

            <span className="px-2 min-w-[64px] text-center tabular-nums text-gray-300">
              {page + 1} / {totalPages}
            </span>

            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page + 1 >= totalPages}
              className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
            >
              Next
            </button>

            <button
              onClick={() => setPage(totalPages - 1)}
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
              {chartLoading && (
                <div className="text-gray-400">Loading…</div>
              )}

              {!chartLoading && chartError && (
                <div className="text-red-400 text-center max-w-md">
                  {chartError}
                </div>
              )}

              {!chartLoading && !chartError && chartData.length > 0 && (
                <FundingChart data={chartData} />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}