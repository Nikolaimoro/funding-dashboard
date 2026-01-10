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

type PageItem = number | "ellipsis";

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
      className="group inline-flex items-center gap-1 select-none text-left"
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

  const [chartCache, setChartCache] = useState<Record<number, ChartPoint[]>>({});

  /* reset page on filters */
  useEffect(() => {
    setPage(0);
  }, [search, selectedExchanges, limit, sortKey, sortDir]);

  /* ---------- data ---------- */

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

  const totalPages = limit === -1 ? 1 : Math.ceil(sortedAll.length / limit);

  const visible = useMemo(() => {
    if (limit === -1) return sortedAll;
    return sortedAll.slice(page * limit, page * limit + limit);
  }, [sortedAll, limit, page]);

  /* ---------- FIX: stable table height ---------- */

  const ROW_HEIGHT = 44; // px — реальная высота строки
  const HEADER_HEIGHT = 48; // px
  const tableHeight =
    limit === -1 || page === totalPages - 1
      ? "auto"
      : HEADER_HEIGHT + ROW_HEIGHT * limit;

  /* ---------- pagination ---------- */

  const pages = useMemo<PageItem[]>(() => {
    if (totalPages <= 1) return [];

    const items: PageItem[] = [];
    const start = Math.max(1, page - 3);
    const end = Math.min(totalPages - 2, page + 3);

    items.push(0);
    if (start > 1) items.push("ellipsis");

    for (let i = start; i <= end; i++) items.push(i);

    if (end < totalPages - 2) items.push("ellipsis");
    items.push(totalPages - 1);

    return items;
  }, [page, totalPages]);

  /* ================= RENDER ================= */

  return (
    <main className="min-h-screen bg-gray-900 p-6 text-gray-100">
      <h1 className="text-3xl font-bold mb-6">Funding Rates Dashboard</h1>

      {/* TABLE */}
      <div
        className="overflow-auto rounded border border-gray-800 bg-gray-800"
        style={{ height: tableHeight }}
      >
        <table className="w-full text-sm table-fixed">
          <thead className="bg-gray-900 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left">
                <SortableHeader
                  label="Exchange"
                  active={sortKey === "exchange"}
                  dir={sortDir}
                  onClick={() => setSortKey("exchange")}
                />
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader
                  label="Market"
                  active={sortKey === "market"}
                  dir={sortDir}
                  onClick={() => setSortKey("market")}
                />
              </th>
              <th className="px-4 py-3 text-center">Chart</th>
              {(["1d","3d","7d","15d","30d","60d"] as SortKey[]).map(h => (
                <th key={h} className="px-4 py-3 text-right">
                  <SortableHeader
                    label={h}
                    active={sortKey === h}
                    dir={sortDir}
                    onClick={() => setSortKey(h)}
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
                <td className="px-4 py-3">{formatExchange(r.exchange)}</td>
                <td className="px-4 py-3 font-mono font-semibold">
                  {r.market}
                </td>
                <td className="px-4 py-3 text-center">📈</td>
                <td className="px-4 py-3 text-right">{r["1d"]?.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right">{r["3d"]?.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right">{r["7d"]?.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right">{r["15d"]?.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right">{r["30d"]?.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right">{r["60d"]?.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-between mt-4 items-center text-sm text-gray-400">
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
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="px-2 py-1 text-gray-400 hover:text-gray-200 border border-transparent hover:border-gray-600 rounded"
            >
              {"<"}
            </button>

            {pages.map((p, i) =>
              p === "ellipsis" ? (
                <span key={i}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-2 py-1 rounded ${
                    p === page
                      ? "text-blue-400"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {p + 1}
                </button>
              )
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="px-2 py-1 text-gray-400 hover:text-gray-200 border border-transparent hover:border-gray-600 rounded"
            >
              {">"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}