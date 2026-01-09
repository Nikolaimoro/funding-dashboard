"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/* ================= TYPES ================= */

type Row = {
  market_id: number;
  exchange: string;
  symbol: string;
  market: string;
  ref_url: string | null;

  "1d": number | null;
  "3d": number | null;
  "7d": number | null;
  "15d": number | null;
  "30d": number | null;
  "60d": number | null;

  updated: string;
};

type SortKey =
  | "exchange"
  | "market"
  | "1d"
  | "3d"
  | "7d"
  | "15d"
  | "30d"
  | "60d";

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
};

const formatExchange = (ex: string) =>
  EXCHANGE_LABEL[ex] ?? ex;

/* ================= COMPONENT ================= */

export default function FundingTable({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState("");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("15d");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [limit, setLimit] = useState<number>(50);
  const [page, setPage] = useState(0);

  /* ===== graph modal state ===== */
  const [chartMarket, setChartMarket] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartDays, setChartDays] = useState(30);

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
      prev.includes(ex)
        ? prev.filter(e => e !== ex)
        : [...prev, ex]
    );
  };

  /* ---------- formatting ---------- */
  const formatAPR = (v: number | null) => {
    if (v === null || Number.isNaN(v)) {
      return <span className="text-gray-500">–</span>;
    }
    const cls =
      v > 0
        ? "text-emerald-400"
        : v < 0
        ? "text-rose-400"
        : "text-gray-400";

    return <span className={`${cls} font-mono`}>{v.toFixed(2)}%</span>;
  };

  /* ---------- sorting ---------- */
  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey !== key
      ? <span className="ml-1 opacity-30">⇅</span>
      : <span className="ml-1 text-blue-300">{sortDir === "asc" ? "↑" : "↓"}</span>;

  /* ---------- filtering ---------- */
  const filteredAll = useMemo(() => {
    let data = rows;

    const q = search.trim().toLowerCase();
    if (q) {
      data = data.filter(r =>
        r.market.toLowerCase().startsWith(q)
      );
    }

    if (selectedExchanges.length > 0) {
      const set = new Set(selectedExchanges);
      data = data.filter(r => set.has(r.exchange));
    }

    return data;
  }, [rows, search, selectedExchanges]);

  /* ---------- sorting ---------- */
  const sortedAll = useMemo(() => {
    const data = [...filteredAll];
    const dir = sortDir === "asc" ? 1 : -1;

    data.sort((a, b) => {
      const ak = a[sortKey as keyof Row];
      const bk = b[sortKey as keyof Row];

      if (sortKey === "exchange") {
        return (
          formatExchange(String(ak))
            .localeCompare(formatExchange(String(bk))) * dir
        );
      }

      if (sortKey === "market") {
        return String(ak).localeCompare(String(bk)) * dir;
      }

      const av = typeof ak === "number" ? ak : null;
      const bv = typeof bk === "number" ? bk : null;

      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;

      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });

    return data;
  }, [filteredAll, sortKey, sortDir]);

  /* ---------- pagination ---------- */
  const totalPages =
    limit === -1 ? 1 : Math.ceil(sortedAll.length / limit);

  const visible = useMemo(() => {
    if (limit === -1) return sortedAll;
    const start = page * limit;
    return sortedAll.slice(start, start + limit);
  }, [sortedAll, limit, page]);

  /* ---------- load chart (lazy) ---------- */
  useEffect(() => {
    if (!chartMarket) return;

    let active = true;
    setChartLoading(true);

    supabase
      .rpc("get_funding_chart", {
        p_market_id: chartMarket.id,
        p_days: chartDays,
      })
      .then(({ data }) => {
        if (!active) return;
        setChartData((data ?? []) as ChartPoint[]);
        setChartLoading(false);
      });

    return () => {
      active = false;
    };
  }, [chartMarket, chartDays]);

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
            className="bg-gray-800 border border-gray-700 px-3 py-2 rounded text-sm"
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
              <div className="absolute z-20 mt-2 bg-gray-800 border border-gray-700 rounded w-56 p-2">
                {exchanges.map(ex => (
                  <label
                    key={ex}
                    className="flex gap-2 px-2 py-1 cursor-pointer hover:bg-gray-700"
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
              <th onClick={() => onSort("exchange")} className="px-4 py-3 cursor-pointer">
                Exchange{sortIndicator("exchange")}
              </th>
              <th onClick={() => onSort("market")} className="px-4 py-3 cursor-pointer">
                Market{sortIndicator("market")}
              </th>
              <th className="px-4 py-3 text-center">📈</th>
              {(["1d","3d","7d","15d","30d","60d"] as SortKey[]).map(h => (
                <th
                  key={h}
                  onClick={() => onSort(h)}
                  className="px-4 py-3 cursor-pointer"
                >
                  {h}{sortIndicator(h)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visible.map(r => (
              <tr key={`${r.exchange}:${r.market}`} className="border-b border-gray-800 hover:bg-gray-700/40">
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
                  ) : r.market}
                </td>

                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() =>
                      setChartMarket({
                        id: r.market_id,
                        title: `${formatExchange(r.exchange)} · ${r.market}`,
                      })
                    }
                    className="text-blue-300 hover:text-blue-200"
                    title="Open funding chart"
                  >
                    📈
                  </button>
                </td>

                <td className="px-4 py-2">{formatAPR(r["1d"])}</td>
                <td className="px-4 py-2">{formatAPR(r["3d"])}</td>
                <td className="px-4 py-2">{formatAPR(r["7d"])}</td>
                <td className="px-4 py-2">{formatAPR(r["15d"])}</td>
                <td className="px-4 py-2">{formatAPR(r["30d"])}</td>
                <td className="px-4 py-2">{formatAPR(r["60d"])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- Pagination ---------- */}
      <div className="flex justify-between items-center mt-3 text-sm text-gray-400">
        <div>
          Rows:
          <select
            className="ml-2 bg-gray-800 border border-gray-700 rounded px-2 py-1"
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={-1}>All</option>
          </select>
        </div>

        {limit !== -1 && totalPages > 1 && (
          <div className="flex gap-3 items-center">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="border border-gray-700 px-3 py-1 rounded disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {page + 1} / {totalPages}
            </span>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="border border-gray-700 px-3 py-1 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ---------- Chart Modal ---------- */}
      {chartMarket && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-[900px] max-w-[95vw]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{chartMarket.title}</h2>
              <button onClick={() => setChartMarket(null)}>✕</button>
            </div>

            <div className="flex gap-2 mb-3">
              {[7, 30, 60].map(d => (
                <button
                  key={d}
                  onClick={() => setChartDays(d)}
                  className={`px-3 py-1 rounded border ${
                    chartDays === d
                      ? "border-blue-500 text-blue-300"
                      : "border-gray-700"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>

            {chartLoading && <div className="text-gray-400">Loading…</div>}
            {!chartLoading && chartData.length === 0 && (
              <div className="text-gray-500">No data</div>
            )}

            {!chartLoading && chartData.length > 0 && (
              <pre className="text-xs text-gray-400 overflow-auto max-h-80">
                {JSON.stringify(chartData, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </main>
  );
}