"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/* ================= TYPES ================= */

export type ArbRow = {
  base_asset: string;
  window_days: number;

  opportunity_apr: number;

  short_exchange: string;
  short_quote: string | null;
  short_open_interest: number | null;
  short_volume_24h: number | null;
  short_url: string | null;

  long_exchange: string;
  long_quote: string | null;
  long_open_interest: number | null;
  long_volume_24h: number | null;
  long_url: string | null;

  open_interest: number | null;
  volume_24h: number | null;
};

/* ================= CONSTS ================= */

const WINDOWS = [
  { label: "Now", value: 0 },
  { label: "1d", value: 1 },
  { label: "3d", value: 3 },
  { label: "7d", value: 7 },
  { label: "15d", value: 15 },
  { label: "30d", value: 30 },
];

const EXCHANGE_LABEL: Record<string, string> = {
  bybit: "Bybit",
  mexc: "MEXC",
  bingx: "BingX",
  paradex: "Paradex",
  binance: "Binance",
  hyperliquid: "Hyperliquid",
};

const formatExchange = (ex: string) => EXCHANGE_LABEL[ex] ?? ex;

/* ================= HELPERS ================= */

const compactUSD = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatCompactUSD = (v: number | null) =>
  v == null || Number.isNaN(v) ? (
    <span className="text-gray-600">–</span>
  ) : (
    <span className="font-mono tabular-nums">${compactUSD.format(v)}</span>
  );

const formatAPR = (v: number) => (
  <span className="font-mono tabular-nums">{v.toFixed(2)}%</span>
);

/* ================= BUTTONS ================= */

function LongButton({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="text-gray-600">–</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block px-3 py-1 rounded-full
                 bg-green-500/20 text-green-400
                 border border-green-500/30
                 hover:bg-green-500/30 transition"
    >
      {label}
    </a>
  );
}

function ShortButton({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="text-gray-600">–</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block px-3 py-1 rounded-full
                 bg-red-500/20 text-red-400
                 border border-red-500/30
                 hover:bg-red-500/30 transition"
    >
      {label}
    </a>
  );
}

/* ================= COMPONENT ================= */

export default function ArbitrageTable() {
  /* ---------- state ---------- */
  const [rows, setRows] = useState<ArbRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [windowDays, setWindowDays] = useState<number>(0);

  const [search, setSearch] = useState("");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);

  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(0);

  /* ---------- load data ---------- */
  useEffect(() => {
  setLoading(true);

  supabase
    .from("arb_opportunities_mv")
    .select("*")
    .eq("window_days", windowDays)
    .order("opportunity_apr", { ascending: false })
    .then(({ data, error }) => {
      if (error) {
        console.error("arb fetch error:", error);
        setRows([]);
      } else {
        setRows((data ?? []) as ArbRow[]);
      }
      setLoading(false);
    });
}, [windowDays]);

  /* ---------- exchanges ---------- */
  const exchanges = useMemo(
    () =>
      Array.from(
        new Set(
          rows.flatMap(r => [r.long_exchange, r.short_exchange])
        )
      ).sort(),
    [rows]
  );

  const toggleExchange = (ex: string) => {
    setSelectedExchanges(prev =>
      prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex]
    );
  };

  /* ---------- filtering ---------- */
  const filtered = useMemo(() => {
    let data = rows;

    if (search.trim()) {
      const q = search.trim().toUpperCase();
      data = data.filter(r => r.base_asset.startsWith(q));
    }

    if (selectedExchanges.length) {
      const set = new Set(selectedExchanges);
      data = data.filter(
        r =>
          set.has(r.long_exchange) &&
          set.has(r.short_exchange)
      );
    }

    return [...data].sort(
      (a, b) => b.opportunity_apr - a.opportunity_apr
    );
  }, [rows, search, selectedExchanges]);

  /* ---------- pagination ---------- */
  const totalPages =
    limit === -1 ? 1 : Math.max(1, Math.ceil(filtered.length / limit));

  const visible = useMemo(() => {
    if (limit === -1) return filtered;
    const start = page * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, limit, page]);

  /* ================= RENDER ================= */

  return (
    <div>
      {/* ---------- Controls ---------- */}
      <div className="flex flex-wrap justify-between gap-4 mb-4">
        <div className="flex gap-3 items-center">
          <input
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            placeholder="Search token"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="relative">
            <details className="group">
              <summary className="cursor-pointer bg-gray-800 border border-gray-700 px-3 py-2 rounded text-sm">
                Exchanges
                {selectedExchanges.length > 0 && (
                  <span className="text-blue-400 ml-1">
                    ({selectedExchanges.length})
                  </span>
                )}
              </summary>

              <div className="absolute z-20 mt-2 bg-gray-800 border border-gray-700 rounded w-56 p-2">
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
            </details>
          </div>
        </div>

        {/* ---------- window selector ---------- */}
        <div className="flex gap-2">
          {WINDOWS.map(w => (
            <button
              key={w.value}
              onClick={() => {
                setWindowDays(w.value);
                setPage(0);
              }}
              className={`px-3 py-1 rounded-md border text-sm
                ${
                  windowDays === w.value
                    ? "bg-blue-500/20 border-blue-400 text-blue-300"
                    : "border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Table ---------- */}
      <div className="overflow-auto rounded border border-gray-800 bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 sticky top-0">
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left">Token</th>
              <th className="px-4 py-3 text-right">APR</th>
              <th className="px-4 py-3 text-left">Long</th>
              <th className="px-4 py-3 text-left">Short</th>
              <th className="px-4 py-3 text-right">Open Interest</th>
              <th className="px-4 py-3 text-right">Volume 24h</th>
            </tr>
          </thead>

          <tbody>
            {!loading &&
              visible.map(r => (
                <tr
                  key={`${r.base_asset}-${r.window_days}`}
                  className="border-b border-gray-800 hover:bg-gray-700/40"
                >
                  <td className="px-4 py-2 font-mono font-semibold">
                    {r.base_asset}
                  </td>

                  <td className="px-4 py-2 text-right text-blue-300">
                    {formatAPR(r.opportunity_apr)}
                  </td>

                  <td className="px-4 py-2">
                    <LongButton
                      href={r.long_url}
                      label={`${formatExchange(r.long_exchange)}`}
                    />
                  </td>

                  <td className="px-4 py-2">
                    <ShortButton
                      href={r.short_url}
                      label={`${formatExchange(r.short_exchange)}`}
                    />
                  </td>

                  <td className="px-4 py-2 text-right">
                    {formatCompactUSD(r.long_open_interest)}{" "}
                    <span className="text-gray-500">/</span>{" "}
                    {formatCompactUSD(r.short_open_interest)}
                  </td>

                  <td className="px-4 py-2 text-right">
                    {formatCompactUSD(r.long_volume_24h)}{" "}
                    <span className="text-gray-500">/</span>{" "}
                    {formatCompactUSD(r.short_volume_24h)}
                  </td>
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
            <button onClick={() => setPage(0)}>First</button>
            <button onClick={() => setPage(p => Math.max(0, p - 1))}>
              Prev
            </button>
            <span>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() =>
                setPage(p => Math.min(totalPages - 1, p + 1))
              }
            >
              Next
            </button>
            <button onClick={() => setPage(totalPages - 1)}>Last</button>
          </div>
        )}
      </div>
    </div>
  );
}