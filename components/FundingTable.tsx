"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { normalizeSymbol, formatExchange } from "@/lib/formatters";
import { FundingRow } from "@/lib/types";
import Pagination from "@/components/Table/Pagination";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import TableControls from "@/components/Table/TableControls";
import FundingTableBody from "@/components/FundingTable/Body";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import { TableEmptyState, TableLoadingState } from "@/components/ui/TableStates";
import { TAILWIND } from "@/lib/theme";

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

/* ================= COMPONENT ================= */

export default function FundingTable({
  rows,
  loading = false,
  error = null,
}: {
  rows: FundingRow[];
  loading?: boolean;
  error?: string | null;
}) {
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
  const maxOI = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.open_interest ?? 0), 0),
    [rows]
  );
  const maxVolume = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.volume_24h ?? 0), 0),
    [rows]
  );

  const toggleExchange = (ex: string) => {
    setSelectedExchanges(prev =>
      prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex]
    );
  };

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  /**
   * Memoized complex sorting, filtering, and ordering of all rows
   * 
   * Process:
   * 1. Text filter: Normalize user search input and match against normalized market names (fuzzy matching)
   * 2. Exchange filter: Include only rows from selected exchanges
   * 3. OI filter: Exclude rows with open_interest below minimum threshold
   * 4. Volume filter: Exclude rows with volume_24h below minimum threshold
   * 5. Sort: Apply multi-key sorting (special handling for exchange names via formatExchange)
   * 
   * Dependencies: [rows, search, selectedExchanges, sortKey, sortDir, minOI, minVolume]
   */
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

  /**
   * Pagination: Calculate total pages and slice visible rows
   * - If limit === -1: Show all rows (single page)
   * - Otherwise: Calculate pages based on limit per page
   */
  const totalPages =
    limit === -1 ? 1 : Math.max(1, Math.ceil(sortedAll.length / limit));

  /**
   * Memoized slice of sorted rows for current page
   * Returns rows for current page offset based on limit
   * Dependencies: [sortedAll, limit, page]
   */
  const visible = useMemo(() => {
    if (limit === -1) return sortedAll;
    const start = page * limit;
    return sortedAll.slice(start, start + limit);
  }, [sortedAll, limit, page]);

  /**
   * Reset page to 0 when filters/search/limit changes
   * Prevents showing empty page after filter narrows results
   */
  useEffect(() => {
    setPage(0);
  }, [search, selectedExchanges, limit]);

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
          maxOI={maxOI}
          maxVolume={maxVolume}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          searchPlaceholder="Search market"
          inputClassName={TAILWIND.input.default}
        />

        {error && (
          <div className="text-red-400 text-sm mb-3">{error}</div>
        )}

        {loading && (
          <TableLoadingState message="Loading funding rates…" />
        )}

        {!loading && visible.length === 0 && (
          <TableEmptyState message="No results for the current filters." />
        )}

        {loading ? (
          <SkeletonLoader rows={8} columns={8} />
        ) : (
          <ErrorBoundary>
            <FundingTableBody
              rows={visible}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              onRowClick={openChart}
            />
          </ErrorBoundary>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          showPagination={limit !== -1 && totalPages > 1}
        />

        <FundingChart
          open={chartOpen}
          onClose={() => setChartOpen(false)}
          marketId={selectedRow?.market_id ?? 0}
          symbol={selectedRow?.market ?? ""}
          exchange={selectedRow ? formatExchange(selectedRow.exchange) : ""}
        />
      </div>
    </ErrorBoundary>
  );
}
