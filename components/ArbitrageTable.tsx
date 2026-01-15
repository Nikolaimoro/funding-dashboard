"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ArbitrageChart from "@/components/ArbitrageChart";
import { formatExchange, normalizeToken } from "@/lib/formatters";
import { SUPABASE_TABLES } from "@/lib/constants";
import { ArbRow } from "@/lib/types";
import Pagination from "@/components/Table/Pagination";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import TableControls from "@/components/Table/TableControls";
import ArbitrageTableBody from "@/components/ArbitrageTable/Body";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import { TableEmptyState, TableLoadingState } from "@/components/ui/TableStates";

/* ================= TYPES ================= */

type SortKey = "opportunity_apr" | "stability";
type SortDir = "asc" | "desc";

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

  /**
   * Extract unique exchanges from all rows (both long and short)
   * Used to populate exchange filter dropdown
   * Dependencies: [rows]
   */
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

  /**
   * Clean up selected exchanges if they're no longer available after data refresh
   * Prevents invalid filter selections when dataset changes
   */
  useEffect(() => {
    if (!selectedExchanges.length) return;
    const available = new Set(exchanges);
    setSelectedExchanges((prev) => prev.filter((ex) => available.has(ex)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchanges.join("|")]);

  /**
   * Memoized filtering and sorting of arbitrage opportunities
   * 
   * Process:
   * 1. Text filter: Match token name (base_asset) with normalized search input
   * 2. Exchange filter: Include only rows where BOTH long AND short exchanges are selected
   * 3. OI filter: Exclude opportunities where either side has insufficient open interest
   * 4. Volume filter: Exclude opportunities where either side has insufficient volume
   * 5. Sort: Apply by opportunity_apr or stability based on sortKey
   * 
   * Dependencies: [rows, search, selectedExchanges, sortKey, sortDir, minOI, minVolume]
   */
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
      data = data.filter(r => (r.long_open_interest ?? 0) >= minOIValue && (r.short_open_interest ?? 0) >= minOIValue);
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

  /**
   * Pagination: Calculate total pages and slice visible rows
   * - If limit === -1: Show all rows (single page)
   * - Otherwise: Calculate pages based on limit per page
   */
  const totalPages =
    limit === -1 ? 1 : Math.max(1, Math.ceil(filtered.length / limit));

  /**
   * Memoized slice of filtered rows for current page
   * Returns rows for current page offset based on limit
   * Dependencies: [filtered, limit, page]
   */
  const visible = useMemo(() => {
    if (limit === -1) return filtered;
    const start = page * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, limit, page]);

  /* ================= RENDER ================= */

  return (
    <ErrorBoundary>
      <div>
        <TableControls
          search={search}
          onSearchChange={setSearch}
          exchanges={exchanges}
          selectedExchanges={selectedExchanges}
          onToggleExchange={toggleExchange}
          filterOpen={filterOpen}
          onFilterOpenChange={setFilterOpen}
          minOI={minOI}
          onMinOIChange={setMinOI}
          minVolume={minVolume}
          onMinVolumeChange={setMinVolume}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          searchPlaceholder="Search token"
          inputClassName="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
        />

        {/* ---------- Loading / Empty ---------- */}
        {loading && (
          <TableLoadingState message="Loading arbitrage opportunities…" />
        )}

        {!loading && filtered.length === 0 && (
          <TableEmptyState message="No opportunities for this filter." />
        )}

        {/* ---------- Table ---------- */}
        {loading ? (
          <SkeletonLoader rows={8} columns={7} />
        ) : (
          <ErrorBoundary>
            <ArbitrageTableBody
              rows={visible}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
              onRowClick={openChart}
              loading={loading}
            />
          </ErrorBoundary>
        )}

        {/* ---------- Pagination ---------- */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          showPagination={limit !== -1 && totalPages > 1}
        />

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
    </ErrorBoundary>
  );
}
