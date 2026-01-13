"use client";

import { useMemo, useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import dynamic from "next/dynamic";
import { EXCHANGE_LABEL, MULTIPLIERS } from "@/lib/constants";
import { formatCompactUSD, formatAPR, formatExchange, normalizeSymbol } from "@/lib/formatters";
import { TAILWIND } from "@/lib/theme";
import { FundingRow } from "@/lib/types";

/* chart — client only */
const FundingChart = dynamic(() => import("@/components/FundingChart"), {
  ssr: false,
});

/* ================= TYPES ================= */

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

export default function FundingTable({ rows }: { rows: FundingRow[] }) {
  /* ---------- state ---------- */
  const [search, setSearch] = useState("");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minOI, setMinOI] = useState<number | "">(0);
  const [minVolume, setMinVolume] = useState<number | "">(0);

  const [sortKey, setSortKey] = useState<SortKey>("volume_24h");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(0);

  /* ---------- chart ---------- */
  const [chartOpen, setChartOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<FundingRow | null>(null);

  function openChart(r: FundingRow) {
    if (r.market_id) {
      setSelectedRow(r);
      setChartOpen(true);
    }
  }

  /* ---------- reset page ---------- */
  useEffect(() => {
    setPage(0);
  }, [search, selectedExchanges, limit, sortKey, sortDir, minOI, minVolume]);

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

const formatCompactUSDNode = (v: number | null) => {
  const text = formatCompactUSD(v);
  return (
    <span className="text-gray-300 font-mono tabular-nums">
      {text}
    </span>
  );
};

const formatAPRNode = (v: number | null) => {
  const text = formatAPR(v);
  return (
    <span className="text-gray-300 font-mono tabular-nums">
      {text}
    </span>
  );
};

const formatUSD = (v: number | null) =>
  v == null || Number.isNaN(v) ? (
    <span className={TAILWIND.text.muted}>–</span>
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

    // Apply OI filter
    const minOIValue = typeof minOI === "number" ? minOI : 0;
    if (minOIValue > 0) {
      data = data.filter(r => (r.open_interest ?? 0) >= minOIValue);
    }

    // Apply Volume filter
    const minVolValue = typeof minVolume === "number" ? minVolume : 0;
    if (minVolValue > 0) {
      data = data.filter(r => (r.volume_24h ?? 0) >= minVolValue);
    }

    const dir = sortDir === "asc" ? 1 : -1;

    return [...data].sort((a, b) => {
      const ak = a[sortKey as keyof FundingRow];
      const bk = b[sortKey as keyof FundingRow];

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
  }, [rows, search, selectedExchanges, sortKey, sortDir, minOI, minVolume]);

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
    setPage(0);
  }, [search, selectedExchanges, limit]);

  /* ================= RENDER ================= */

  return (
    <main className="min-h-screen bg-gray-900 p-6 text-gray-200">
      <h1 className="text-2xl font-semibold mb-4">
        Funding Rates Dashboard
      </h1>

      {/* ---------- Controls ---------- */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          className={TAILWIND.input.default}
          placeholder="Search market"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="relative">
          <button
            onClick={() => setFilterOpen(v => !v)}
            className={`${TAILWIND.input.default} hover:border-gray-600 transition`}
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
                    className="flex gap-2 px-2 py-1 cursor-pointer hover:bg-gray-700 rounded items-center"
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

        <div className="relative">
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`${TAILWIND.input.default} hover:border-gray-600 transition`}
          >
            Filters
            {(minOI > 0 || minVolume > 0) && (
              <span className="text-blue-400 ml-1">
                ({(minOI > 0 ? 1 : 0) + (minVolume > 0 ? 1 : 0)})
              </span>
            )}
          </button>

          {filtersOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setFiltersOpen(false)}
              />
              <div className="absolute z-20 mt-2 bg-gray-800 border border-gray-700 rounded w-56 p-3 shadow-lg space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Min OI</label>
                  <input
                    type="number"
                    value={minOI}
                    onChange={(e) => setMinOI(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Min Volume</label>
                  <input
                    type="number"
                    value={minVolume}
                    onChange={(e) => setMinVolume(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---------- Table ---------- */}
      <div className={`overflow-auto rounded ${TAILWIND.border.default} ${TAILWIND.bg.surface}`}>
        <table className="w-full text-sm">
          <thead className={`${TAILWIND.bg.dark} sticky top-0`}>
            <tr className="border-b border-gray-700">
              <th className={TAILWIND.table.header}>
                <SortableHeader
                  label="Exchange"
                  active={sortKey === "exchange"}
                  dir={sortDir}
                  onClick={() => onSort("exchange")}
                />
              </th>
              <th className={TAILWIND.table.header}>
                <SortableHeader
                  label="Market"
                  active={sortKey === "market"}
                  dir={sortDir}
                  onClick={() => onSort("market")}
                />
              </th>
              
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
              <th className="px-4 py-3 w-8"></th>
            </tr>
          </thead>

          <tbody>
            {visible.map(r => (
              <tr
                key={`${r.exchange}:${r.market}`}
                onClick={() => openChart(r)}
                className={`${TAILWIND.table.row} ${TAILWIND.bg.hover} cursor-pointer`}
              >
                <td className={TAILWIND.table.cell}>{formatExchange(r.exchange)}</td>
                <td className="px-4 py-2 font-mono font-semibold">
                  {r.ref_url ? (
                    <a
                      href={r.ref_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:underline"
                    >
                      {r.market}
                    </a>
                  ) : (
                    r.market
                  )}
                </td>

<td className="px-4 py-2 text-right">
  {formatCompactUSDNode(r.open_interest)}
</td>

<td className="px-4 py-2 text-right">
  {formatCompactUSDNode(r.volume_24h)}
</td>

<td className="px-4 py-2 text-right">
  {formatAPRNode(r.funding_rate_now)}
</td>

                <td className="px-4 py-2 text-right">{formatAPRNode(r["1d"])}</td>
                <td className="px-4 py-2 text-right">{formatAPRNode(r["3d"])}</td>
                <td className="px-4 py-2 text-right">{formatAPRNode(r["7d"])}</td>
                <td className="px-4 py-2 text-right">{formatAPRNode(r["15d"])}</td>
                <td className="px-4 py-2 text-right">{formatAPRNode(r["30d"])}</td>
                <td className="px-4 py-2 text-center">
                  {r.market_id && (
                    <ExternalLink size={16} className="text-gray-500" />
                  )}
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

      {/* ---------- Chart Modal ---------- */}
      <FundingChart
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        marketId={selectedRow?.market_id ?? 0}
        symbol={selectedRow?.market ?? ""}
        exchange={selectedRow ? formatExchange(selectedRow.exchange) : ""}
      />
    </main>
  );
}