"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ArbitrageChart from "@/components/ArbitrageChart";
import { ExternalLink } from "lucide-react";
import { EXCHANGE_LABEL, MULTIPLIERS, SUPABASE_TABLES } from "@/lib/constants";
import { formatCompactUSD, formatAPR, formatExchange, normalizeToken } from "@/lib/formatters";
import { TAILWIND } from "@/lib/theme";
import { ArbRow } from "@/lib/types";

/* ================= TYPES ================= */

type SortKey = "opportunity_apr" | "stability";
type SortDir = "asc" | "desc";

/* ================= BUTTONS ================= */

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

function LongButton({
  href,
  label,
}: {
  href: string | null;
  label: string;
}) {
  if (!href) return <span className="text-gray-600">–</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="
        inline-flex items-center px-3 py-1 rounded-md
        bg-green-500/20 text-green-400
        border border-green-500/30
        hover:bg-green-500/30 transition
        whitespace-nowrap
      "
    >
      {label}
    </a>
  );
}

function ShortButton({
  href,
  label,
}: {
  href: string | null;
  label: string;
}) {
  if (!href) return <span className="text-gray-600">–</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="
        inline-flex items-center px-3 py-1 rounded-md
        bg-red-500/20 text-red-400
        border border-red-500/30
        hover:bg-red-500/30 transition
        whitespace-nowrap
      "
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

  const [search, setSearch] = useState("");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minOI, setMinOI] = useState<number | "">(0);
  const [minVolume, setMinVolume] = useState<number | "">(0);

  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(0);

  const [sortKey, setSortKey] = useState<SortKey>("stability");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [chartOpen, setChartOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ArbRow | null>(null);

  function openChart(r: ArbRow) {
    setSelectedRow(r);
    setChartOpen(true);
}

  function toggleSort(key: SortKey) {
  if (sortKey === key) {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  } else {
    setSortKey(key);
    setSortDir("desc");
  }
}


  /* ---------- reset page on filters ---------- */
  useEffect(() => {
    setPage(0);
  }, [search, selectedExchanges, limit]);

  /* ---------- load data (per window) ---------- */
  useEffect(() => {
  setLoading(true);

    supabase
      .from(SUPABASE_TABLES.ARB_OPPORTUNITIES)
      .select("*")
      .order("stability", { ascending: false })
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
}, []);

  /* ---------- exchanges list ---------- */
  const exchanges = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.long_exchange) set.add(r.long_exchange);
      if (r.short_exchange) set.add(r.short_exchange);
    }
    return Array.from(set).sort();
  }, [rows]);

  const toggleExchange = (ex: string) => {
    setSelectedExchanges((prev) =>
      prev.includes(ex) ? prev.filter((e) => e !== ex) : [...prev, ex]
    );
  };

  // если после смены окна выбранные биржи недоступны — убираем их
  useEffect(() => {
    if (!selectedExchanges.length) return;
    const available = new Set(exchanges);
    setSelectedExchanges((prev) => prev.filter((ex) => available.has(ex)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchanges.join("|")]);

  /* ---------- filtering + sorting ---------- */
  const filtered = useMemo(() => {
    let data = rows;

    const qRaw = search.trim();
    if (qRaw) {
      const q = normalizeToken(qRaw);
      data = data.filter((r) => normalizeToken(r.base_asset).startsWith(q));
    }

    if (selectedExchanges.length) {
      const set = new Set(selectedExchanges);
      data = data.filter(
        (r) => set.has(r.long_exchange) && set.has(r.short_exchange)
      );
    }

    // Apply OI filter
    const minOIValue = typeof minOI === "number" ? minOI : 0;
    if (minOIValue > 0) {
      data = data.filter(r => (r.long_oi ?? 0) >= minOIValue && (r.short_oi ?? 0) >= minOIValue);
    }

    // Apply Volume filter
    const minVolValue = typeof minVolume === "number" ? minVolume : 0;
    if (minVolValue > 0) {
      data = data.filter(r => (r.long_volume_24h ?? 0) >= minVolValue && (r.short_volume_24h ?? 0) >= minVolValue);
    }

    // MV уже отсортирована по opportunity_apr desc,
    // но после фильтров порядок может "плыть" — перестрахуемся
    return [...data].sort((a, b) => {
  const av = a[sortKey] ?? 0;
  const bv = b[sortKey] ?? 0;
  return sortDir === "asc" ? av - bv : bv - av;
});
  }, [rows, search, selectedExchanges, sortKey, sortDir, minOI, minVolume]);

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
      <div className="flex flex-wrap justify-between gap-4 mb-4 items-center">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            placeholder="Search token"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Exchanges dropdown (как в FundingTable, без <details>) */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className="bg-gray-800 border border-gray-700 px-3 py-2 rounded text-sm hover:border-gray-600 transition"
              type="button"
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
                  {exchanges.map((ex) => (
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
                  {exchanges.length === 0 && (
                    <div className="px-2 py-2 text-gray-500 text-sm">
                      No exchanges
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="bg-gray-800 border border-gray-700 px-3 py-2 rounded text-sm hover:border-gray-600 transition"
              type="button"
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

        {/* ---------- window selector ---------- */}
       
      </div>

      {/* ---------- Loading / Empty ---------- */}
      {loading && (
        <div className="text-gray-400 text-sm mb-3">Loading…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-gray-500 text-sm mb-3">
          No opportunities for this filter.
        </div>
      )}

      {/* ---------- Table ---------- */}
      <div className="overflow-auto rounded border border-gray-800 bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 sticky top-0">
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left">Token</th>

              <th className="px-4 py-3 text-right">
                <SortableHeader
                  label="APR"
                  active={sortKey === "opportunity_apr"}
                  dir={sortDir}
                  onClick={() => toggleSort("opportunity_apr")}
                />
              </th>

              <th className="px-4 py-3 text-left">Long / Short</th>
              <th className="px-4 py-3 text-right">Open Interest</th>
              <th className="px-4 py-3 text-right">Volume 24h</th>

              <th className="px-4 py-3 text-right">
                <SortableHeader
                  label="Stability"
                  active={sortKey === "stability"}
                  dir={sortDir}
                  onClick={() => toggleSort("stability")}
                />
              </th>

              <th className="px-4 py-3 text-right"></th>

            </tr>
          </thead>

          <tbody>
            {!loading &&
              visible.map((r) => (
                <tr
                  key={`${r.base_asset}-${r.long_market_id}-${r.short_market_id}`}
                  onClick={() => openChart(r)}
                  className="border-b border-gray-800 hover:bg-gray-700/40 cursor-pointer"
                >
                  <td className="px-4 py-2 font-mono font-semibold">
                    {r.base_asset}
                  </td>

                  <td className="px-4 py-2 text-right text-blue-300">
                    <span className="text-gray-300 font-mono tabular-nums">
                      {formatAPR(r.opportunity_apr)}
                    </span>
                  </td>

                  <td className="px-4 py-2 flex gap-2">
                    <LongButton
                      href={r.long_url}
                      label={`${formatExchange(r.long_exchange)}${ r.long_quote ? ` (${r.long_quote})` : ""}`}
                    />
                    <ShortButton
                      href={r.short_url}
                      label={`${formatExchange(r.short_exchange)}${ r.short_quote ? ` (${r.short_quote})` : ""}`}
                    />
                  </td>

                  <td className="px-4 py-2 text-right">
                    <span className="text-gray-300 font-mono tabular-nums">
                      {formatCompactUSD(r.long_open_interest)}
                    </span>
                    <span className="text-gray-500"> / </span>
                    <span className="text-gray-300 font-mono tabular-nums">
                      {formatCompactUSD(r.short_open_interest)}
                    </span>
                  </td>

                  <td className="px-4 py-2 text-right">
                    <span className="text-gray-300 font-mono tabular-nums">
                      {formatCompactUSD(r.long_volume_24h)}
                    </span>
                    <span className="text-gray-500"> / </span>
                    <span className="text-gray-300 font-mono tabular-nums">
                      {formatCompactUSD(r.short_volume_24h)}
                    </span>
                  </td>

                  <td className="px-4 py-2 text-right font-mono text-emerald-400">
                    {r.stability?.toFixed(2)}
                  </td>

                  <td className="px-4 py-2 text-right text-gray-500">
                    <ExternalLink size={16} />
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
            onChange={(e) => setLimit(Number(e.target.value))}
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
              type="button"
            >
              First
            </button>

            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
              type="button"
            >
              Prev
            </button>

            <span className="px-2 min-w-[64px] text-center tabular-nums text-gray-300">
              {page + 1} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page + 1 >= totalPages}
              className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
              type="button"
            >
              Next
            </button>

            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page + 1 >= totalPages}
              className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
              type="button"
            >
              Last
            </button>
          </div>
        )}
      </div>

<ArbitrageChart
  open={chartOpen}
  onClose={() => setChartOpen(false)}
  baseAsset={selectedRow?.base_asset ?? ""}
  longMarketId={selectedRow?.long_market_id ?? 0}
  shortMarketId={selectedRow?.short_market_id ?? 0}
  longLabel={
    selectedRow
      ? `${formatExchange(selectedRow.long_exchange)}${selectedRow.long_quote ? ` (${selectedRow.long_quote})` : ""}`
      : ""
  }
  shortLabel={
    selectedRow
      ? `${formatExchange(selectedRow.short_exchange)}${selectedRow.short_quote ? ` (${selectedRow.short_quote})` : ""}`
      : ""
  }
/>

    </div>
  );
}