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

const formatExchange = (ex: string) => EXCHANGE_LABEL[ex] ?? ex;

/* ================= UI HELPERS ================= */

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
      className="group inline-flex items-center gap-1 cursor-pointer select-none text-left"
    >
      <span className="text-gray-400 transition-colors group-hover:text-gray-200">
        {label}
      </span>

      {!active && (
        <span className="text-xs opacity-0 transition-opacity group-hover:opacity-70 text-gray-500">
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
  const [search, setSearch] = useState("");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("15d");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(0);

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
    setSelectedExchanges(p =>
      p.includes(ex) ? p.filter(e => e !== ex) : [...p, ex]
    );
  };

  /* ---------- formatting ---------- */
  const formatAPR = (v: number | null) =>
    v == null ? (
      <span className="text-gray-600">–</span>
    ) : (
      <span className="text-gray-300 font-mono tabular-nums">
        {v.toFixed(2)}%
      </span>
    );

  /* ---------- sorting ---------- */
  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  /* ---------- filtering ---------- */
  const filteredAll = useMemo(() => {
    let data = rows;

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(r => r.market.toLowerCase().startsWith(q));
    }

    if (selectedExchanges.length) {
      const s = new Set(selectedExchanges);
      data = data.filter(r => s.has(r.exchange));
    }

    return data;
  }, [rows, search, selectedExchanges]);

  /* ---------- sorting ---------- */
  const sortedAll = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filteredAll].sort((a, b) => {
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
  }, [filteredAll, sortKey, sortDir]);

  /* ---------- pagination ---------- */
  const totalPages = limit === -1 ? 1 : Math.ceil(sortedAll.length / limit);

  const visible = useMemo(() => {
    if (limit === -1) return sortedAll;
    return sortedAll.slice(page * limit, page * limit + limit);
  }, [sortedAll, limit, page]);

  /* ---------- chart ---------- */
  useEffect(() => {
    if (!chartMarket?.id) return;

    const cached = chartCache[chartMarket.id];
    if (cached) {
      setChartData(cached);
      setChartLoading(false);
      return;
    }

    setChartLoading(true);
    supabase
      .rpc("get_funding_chart", { p_market_id: chartMarket.id })
      .then(({ data, error }) => {
        if (error) {
          setChartError(error.message);
        } else {
          setChartData(data ?? []);
          setChartCache(p => ({ ...p, [chartMarket.id!]: data ?? [] }));
        }
        setChartLoading(false);
      });
  }, [chartMarket]);

  /* ================= RENDER ================= */

  return (
    <main className="min-h-screen bg-gray-900 p-6 text-gray-100">
      <h1 className="text-3xl font-bold mb-6">Funding Rates Dashboard</h1>

      {/* controls */}
      <div className="flex gap-3 mb-4">
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
          </button>

          {filterOpen && (
            <div className="absolute mt-2 bg-gray-800 border border-gray-700 rounded p-2">
              {exchanges.map(ex => (
                <label key={ex} className="flex gap-2 px-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedExchanges.includes(ex)}
                    onChange={() => toggleExchange(ex)}
                  />
                  {formatExchange(ex)}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* table */}
      <div className="overflow-auto rounded border border-gray-800 bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
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
              <th className="px-4 py-3 text-center">Chart</th>
              {(["1d","3d","7d","15d","30d","60d"] as SortKey[]).map(h => (
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
              <tr key={r.market} className="hover:bg-gray-700/40">
                <td className="px-4 py-3">{formatExchange(r.exchange)}</td>
                <td className="px-4 py-3 font-mono font-semibold">
                  {r.ref_url ? (
                    <a href={r.ref_url} className="text-blue-400">
                      {r.market}
                    </a>
                  ) : (
                    r.market
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {r.market_id && (
                    <button
                      onClick={() =>
                        setChartMarket({
                          id: r.market_id!,
                          title: `${formatExchange(r.exchange)} · ${r.market}`,
                        })
                      }
                    >
                      📈
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{formatAPR(r["1d"])}</td>
                <td className="px-4 py-3 text-right">{formatAPR(r["3d"])}</td>
                <td className="px-4 py-3 text-right">{formatAPR(r["7d"])}</td>
                <td className="px-4 py-3 text-right">{formatAPR(r["15d"])}</td>
                <td className="px-4 py-3 text-right">{formatAPR(r["30d"])}</td>
                <td className="px-4 py-3 text-right">{formatAPR(r["60d"])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between mt-4">
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

          <div className="flex gap-2 items-center">
            <button
              className="px-2 text-gray-400 hover:text-gray-200"
              disabled={page === 0}
              onClick={() => setPage(0)}
            >
              {"<<"}
            </button>

            <button
              className="px-2 text-gray-400 hover:text-gray-200"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              {"<"}
            </button>

            <span className="px-2 text-gray-400">
              Page {page + 1} / {totalPages}
            </span>

            <button
              className="px-2 text-gray-400 hover:text-gray-200"
              disabled={page >= totalPages - 1}
              onClick={() =>
                setPage(p => Math.min(totalPages - 1, p + 1))
              }
            >
              {">"}
            </button>

            <button
              className="px-2 text-gray-400 hover:text-gray-200"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(totalPages - 1)}
            >
              {">>"}
            </button>
          </div>
        </div>
      )}

      {/* modal */}
      {chartMarket && (
        <div
          className="fixed inset-0 z-50 backdrop-blur transition-[backdrop-filter] duration-300"
          onClick={() => setChartMarket(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[900px] mx-auto mt-24"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="mb-4">{chartMarket.title}</h2>
            <FundingChart data={chartData} />
          </div>
        </div>
      )}
    </main>
  );
}