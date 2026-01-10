"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import FundingChart from "@/components/FundingChart";

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

/* ================= COMPONENT ================= */

export default function FundingTable({ rows }: { rows: Row[] }) {
  /* ---------- table state ---------- */
  const [search, setSearch] = useState("");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("15d");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [limit, setLimit] = useState<number>(50);
  const [page, setPage] = useState(0);

  /* ---------- chart modal ---------- */
  const [chartMarket, setChartMarket] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

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
    sortKey !== key ? (
      <span className="ml-1 opacity-30">⇅</span>
    ) : (
      <span className="ml-1 text-blue-300">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );

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

  /* ---------- load chart ---------- */
  useEffect(() => {
    if (!chartMarket?.id) return;

    let active = true;
    setChartLoading(true);

    supabase
      .rpc("get_funding_chart", {
        p_market_id: chartMarket.id,
      })
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          console.error("Funding chart error:", error);
          setChartData([]);
        } else {
          setChartData((data ?? []) as ChartPoint[]);
        }

        setChartLoading(false);
      });

    return () => {
      active = false;
    };
  }, [chartMarket]);

  const closeChart = () => {
    setChartMarket(null);
    setChartData([]);
    setChartLoading(false);
  };

  /* ================= RENDER ================= */

  return (
    <main className="min-h-screen bg-gray-900 p-6 text-gray-200">
      {/* ----- остальной JSX БЕЗ ИЗМЕНЕНИЙ ----- */}

      {/* ---------- Chart Modal ---------- */}
      {chartMarket && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-[900px] max-w-[95vw]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{chartMarket.title}</h2>
              <button
                onClick={closeChart}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {chartLoading && <div className="text-gray-400">Loading…</div>}
            {!chartLoading && chartData.length === 0 && (
              <div className="text-gray-500">No data</div>
            )}
            {!chartLoading && chartData.length > 0 && (
              <FundingChart
                title={chartMarket.title}
                data={chartData}
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}