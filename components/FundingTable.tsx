"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { normalizeSymbol, formatExchange } from "@/lib/formatters";
import { FundingRow, SortDir } from "@/lib/types";
import Pagination from "@/components/Table/Pagination";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import TableControls from "@/components/Table/TableControls";
import FundingTableBody from "@/components/FundingTable/Body";
import FundingMobileCards from "@/components/FundingTable/MobileCards";
import FundingMobileSort from "@/components/FundingTable/MobileSort";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import { TableEmptyState, TableLoadingState } from "@/components/ui/TableStates";
import { TAILWIND } from "@/lib/theme";

/* chart — client only */
const FundingChart = dynamic(() => import("@/components/FundingChart"), {
  ssr: false,
});

/* ================= CONSTANTS ================= */

const EXCHANGES_KEY = "markets-exchanges";

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
  | "30d";

type GmxSide = "long" | "short";

type FundingRowWithGmx = FundingRow & {
  gmxBase?: string;
  gmxSide?: GmxSide;
  gmxHasOther?: boolean;
};

const GMX_EXCHANGE = "gmx";

const parseGmxMarket = (market: string) => {
  const match = market.match(/\s+(LONG|SHORT)\s*$/i);
  if (!match) return null;
  const side = match[1].toLowerCase() as GmxSide;
  const baseMarket = market.replace(/\s+(LONG|SHORT)\s*$/i, "").trim();
  return { side, baseMarket };
};

/* ================= COMPONENT ================= */

export default function FundingTable({
  rows,
  loading = false,
  error = null,
  onRetry,
}: {
  rows: FundingRow[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  /* ---------- state ---------- */
  const [search, setSearch] = useState("");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exchangesInitialized, setExchangesInitialized] = useState(false);
  
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minOI, setMinOI] = useState<number | "">(0);
  const [minVolume, setMinVolume] = useState<number | "">(0);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("volume_24h");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(0);
  const [gmxSideByMarket, setGmxSideByMarket] = useState<Record<string, GmxSide>>({});

  /* ---------- chart ---------- */
  const [chartOpen, setChartOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<FundingRow | null>(null);
  const exchanges = useMemo(
    () => Array.from(new Set(rows.map(r => r.exchange))).sort(),
    [rows]
  );

  function openChart(r: FundingRow) {
    if (r.market_id) {
      setSelectedRow(r);
      setChartOpen(true);
    }
  }

  const resetPage = () => setPage(0);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    resetPage();
  };

  const handleMinOIChange = (value: number | "") => {
    setMinOI(value);
    resetPage();
  };

  const handleMinVolumeChange = (value: number | "") => {
    setMinVolume(value);
    resetPage();
  };

  const toggleExchange = (ex: string) => {
    setSelectedExchanges(prev =>
      prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex]
    );
    resetPage();
  };
  const resetExchanges = () => {
    setSelectedExchanges(exchanges);
    resetPage();
  };

  const clearExchanges = () => {
    setSelectedExchanges([]);
    resetPage();
  };

  useEffect(() => {
    if (!exchanges.length) return;
    // Try to load from localStorage first
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(EXCHANGES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const available = new Set(exchanges);
            const valid = parsed.filter((ex): ex is string => typeof ex === "string" && available.has(ex));
            if (valid.length > 0) {
              setSelectedExchanges(valid);
              setExchangesInitialized(true);
              return;
            }
          }
        }
      } catch {
        // ignore
      }
    }
    setSelectedExchanges(exchanges);
    setExchangesInitialized(true);
  }, [exchanges.join("|")]);

  // Save exchange selection to localStorage (only after initial load)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!exchangesInitialized) return; // Don't save until initial load is complete
    try {
      window.localStorage.setItem(EXCHANGES_KEY, JSON.stringify(selectedExchanges));
    } catch {
      // ignore storage errors
    }
  }, [selectedExchanges, exchangesInitialized]);

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    resetPage();
  };

  const setSort = (key: SortKey, dir: SortDir) => {
    setSortKey(key);
    setSortDir(dir);
    resetPage();
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
  const gmxGroups = useMemo(() => {
    const groups = new Map<
      string,
      { baseMarket: string; longRow?: FundingRow; shortRow?: FundingRow }
    >();
    for (const row of rows) {
      if (row.exchange.toLowerCase() !== GMX_EXCHANGE) continue;
      const parsed = parseGmxMarket(row.market);
      if (!parsed) continue;
      const key = parsed.baseMarket.toLowerCase();
      const current = groups.get(key) ?? { baseMarket: parsed.baseMarket };
      if (parsed.side === "long") current.longRow = row;
      if (parsed.side === "short") current.shortRow = row;
      groups.set(key, current);
    }
    return groups;
  }, [rows]);

  useEffect(() => {
    setGmxSideByMarket((prev) => {
      if (gmxGroups.size === 0) {
        return {};
      }
      const next: Record<string, GmxSide> = {};
      for (const [key, group] of gmxGroups.entries()) {
        const existing = prev[key];
        if (existing) {
          next[key] = existing;
        } else if (group.shortRow) {
          next[key] = "short";
        } else {
          next[key] = "long";
        }
      }
      return next;
    });
  }, [gmxGroups]);

  const displayRows = useMemo(() => {
    const merged: FundingRowWithGmx[] = [];

    for (const row of rows) {
      if (row.exchange.toLowerCase() !== GMX_EXCHANGE) {
        merged.push(row);
        continue;
      }
      const parsed = parseGmxMarket(row.market);
      if (!parsed) {
        merged.push(row);
      }
    }

    for (const [key, group] of gmxGroups.entries()) {
      const selectedSide = gmxSideByMarket[key] ?? (group.longRow ? "long" : "short");
      const selectedRow =
        selectedSide === "long" ? group.longRow ?? group.shortRow : group.shortRow ?? group.longRow;
      if (!selectedRow) continue;
      merged.push({
        ...selectedRow,
        market: group.baseMarket,
        gmxBase: key,
        gmxSide: selectedSide,
        gmxHasOther: !!(group.longRow && group.shortRow),
      });
    }

    return merged;
  }, [rows, gmxGroups, gmxSideByMarket]);

  const maxOI = useMemo(
    () =>
      displayRows.reduce((max, row) => Math.max(max, row.open_interest ?? 0), 0),
    [displayRows]
  );
  const maxVolume = useMemo(
    () =>
      displayRows.reduce((max, row) => Math.max(max, row.volume_24h ?? 0), 0),
    [displayRows]
  );

  const sortedAll = useMemo(() => {
    let data = displayRows;

    const qRaw = search.trim();
    if (qRaw) {
      const q = normalizeSymbol(qRaw);
      data = data.filter(r => normalizeSymbol(r.market).startsWith(q));
    }

    if (exchanges.length > 0 && selectedExchanges.length === 0) {
      data = [];
    } else if (selectedExchanges.length) {
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
  }, [displayRows, search, selectedExchanges, sortKey, sortDir, minOI, minVolume]);

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

  const handleLimitChange = (value: number) => {
    setLimit(value);
    resetPage();
  };

  /* ================= RENDER ================= */

  return (
    <ErrorBoundary>
      <div className="rounded-2xl border border-[#343a4e] bg-[#292e40]">
        <div className="flex flex-wrap items-center gap-4 px-4 py-4">
          <h2 className="text-base font-roboto text-white">Markets</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <FundingMobileSort
              open={mobileSortOpen}
              onOpenChange={setMobileSortOpen}
              sortKey={sortKey}
              sortDir={sortDir}
              onSelect={setSort}
            />
            <TableControls
              search={search}
              onSearchChange={handleSearchChange}
              exchanges={exchanges}
              selectedExchanges={selectedExchanges}
              onToggleExchange={toggleExchange}
              onCheckAllExchanges={resetExchanges}
              onUncheckAllExchanges={clearExchanges}
              filterOpen={filterOpen}
              onFilterOpenChange={setFilterOpen}
              minOI={minOI}
              onMinOIChange={handleMinOIChange}
              minVolume={minVolume}
              onMinVolumeChange={handleMinVolumeChange}
              maxOI={maxOI}
              maxVolume={maxVolume}
              filtersOpen={filtersOpen}
              onFiltersOpenChange={setFiltersOpen}
              searchPlaceholder="Search market"
              inputClassName={TAILWIND.input.default}
            />
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm mb-3 flex items-center gap-2">
            <span>{error}</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1 text-gray-300 hover:text-white transition-colors"
                aria-label="Retry loading"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            )}
          </div>
        )}

        <FundingMobileCards
          rows={sortedAll}
          loading={loading}
          onOpenChart={openChart}
          onToggleGmxSide={(key) =>
            setGmxSideByMarket((prev) => ({
              ...prev,
              [key]: prev[key] === "long" ? "short" : "long",
            }))
          }
        />

        {loading && (
          <div className="hidden min-[960px]:block">
            <TableLoadingState message="Loading funding rates…" />
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="hidden min-[960px]:block">
            <TableEmptyState message="No results for the current filters." />
          </div>
        )}

        <div className="hidden min-[960px]:block">
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
                onToggleGmxSide={(key) =>
                  setGmxSideByMarket((prev) => ({
                    ...prev,
                    [key]: prev[key] === "long" ? "short" : "long",
                  }))
                }
              />
            </ErrorBoundary>
          )}
        </div>

        <div className="px-4 pb-4 hidden min-[960px]:block">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
            showPagination={limit !== -1 && totalPages > 1}
          />
        </div>

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
