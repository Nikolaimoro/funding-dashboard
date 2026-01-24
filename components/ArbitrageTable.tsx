"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Pin } from "lucide-react";
import dynamic from "next/dynamic";
import { formatExchange, normalizeToken } from "@/lib/formatters";
import { ArbRow, SortDir } from "@/lib/types";
import Pagination from "@/components/Table/Pagination";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import TableControls from "@/components/Table/TableControls";
import ArbitrageTableBody from "@/components/ArbitrageTable/Body";
import ArbitrageMobileCards from "@/components/ArbitrageTable/MobileCards";
import MobileSort from "@/components/ArbitrageTable/MobileSort";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import { TableEmptyState, TableLoadingState } from "@/components/ui/TableStates";
import { TAILWIND } from "@/lib/theme";
import { getLocalCache, setLocalCache, withTimeout } from "@/lib/async";

const ArbitrageChart = dynamic(() => import("@/components/ArbitrageChart"), {
  ssr: false,
});
/* ================= TYPES ================= */

type SortKey = "apr_spread" | "stability";
const TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 2;
const CACHE_KEY = "cache-arbitrage-rows";
const CACHE_TTL_MS = 3 * 60 * 1000;
const EXCHANGES_KEY = "arbitrage-exchanges";
const PINNED_EXCHANGES_KEY = "arbitrage-pinned-exchanges";
/* ================= COMPONENT ================= */

export default function ArbitrageTable({
  initialRows = [],
}: {
  initialRows?: ArbRow[];
}) {
  /* ---------- state ---------- */
  const initialHasRows = initialRows.length > 0;
  const [rows, setRows] = useState<ArbRow[]>(initialRows);
  const [loading, setLoading] = useState(!initialHasRows);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const [search, setSearch] = useState("");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exchangesInitialized, setExchangesInitialized] = useState(false);
  
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minOI, setMinOI] = useState<number | "">(0);
  const [minVolume, setMinVolume] = useState<number | "">(0);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);

  const [pinnedExchanges, setPinnedExchanges] = useState<string[]>([]);

  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(0);

  const [sortKey, setSortKey] = useState<SortKey>("stability");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [chartOpen, setChartOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ArbRow | null>(null);

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

  const togglePinned = (ex: string) => {
    setPinnedExchanges((prev) =>
      prev.includes(ex) ? prev.filter((e) => e !== ex) : [...prev, ex]
    );
  };

  const clearPinnedExchanges = () => {
    setPinnedExchanges([]);
  };

  const handleLimitChange = (value: number) => {
    setLimit(value);
    resetPage();
  };

  const buildBacktesterUrl = (row: ArbRow) => {
    const longExchange = row.long_exchange?.toLowerCase() || "";
    const shortExchange = row.short_exchange?.toLowerCase() || "";
    const longQuote = row.long_quote?.toLowerCase() || "usdt";
    const shortQuote = row.short_quote?.toLowerCase() || "usdt";
    const exchange1 = `${longExchange}${longQuote}`;
    const exchange2 = `${shortExchange}${shortQuote}`;
    return `/backtester?token=${encodeURIComponent(row.base_asset)}&exchange1=${encodeURIComponent(exchange1)}&exchange2=${encodeURIComponent(exchange2)}`;
  };

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
    resetPage();
  }

  const setSort = (key: SortKey, dir: SortDir) => {
    setSortKey(key);
    setSortDir(dir);
    resetPage();
  };


  /* ---------- load data (per window) ---------- */
  useEffect(() => {
    let cancelled = false;
    let attemptId = 0;

    const cached = getLocalCache<ArbRow[]>(CACHE_KEY, CACHE_TTL_MS);
    const hasCache = !!cached && cached.length > 0;
    const hasInitial = initialRows.length > 0;
    if (hasCache) {
      setRows(cached!);
      setLoading(false);
      setError(null);
    } else if (hasInitial) {
      setRows(initialRows);
      setLoading(false);
      setError(null);
    }

    const fetchRows = async () => {
      const res = await fetch("/api/dashboard?type=arbitrage", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to load arbitrage data");
      }
      const json = (await res.json()) as { rows?: ArbRow[] };
      return json.rows ?? [];
    };

    const load = async () => {
      setLoading(!(hasCache || hasInitial));
      setError(null);

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const currentAttempt = ++attemptId;

        try {
          const data = await withTimeout(fetchRows(), TIMEOUT_MS);
          if (!cancelled && currentAttempt === attemptId) {
            setRows(data);
            setLoading(false);
            setLocalCache(CACHE_KEY, data);
          }
          return;
        } catch (err) {
          if (cancelled || currentAttempt !== attemptId) {
            return;
          }

          if (hasCache || hasInitial) {
            setLoading(false);
            return;
          }

          if (err instanceof Error && err.message === "timeout") {
            if (attempt < MAX_ATTEMPTS - 1) {
              continue;
            }
            setError("Error loading data: Request timed out");
          } else {
            console.error("arb fetch error:", err);
            const message = err instanceof Error ? err.message : "Unknown error";
            setError(`Error loading data: ${message}`);
          }
          setLoading(false);
          return;
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      attemptId += 1;
    };
  }, [retryToken, initialRows]);

  const handleRetry = () => {
    setRetryToken((t) => t + 1);
  };

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
  const maxOI = useMemo(
    () =>
      rows.reduce(
        (max, row) =>
          Math.max(
            max,
            row.long_open_interest ?? 0,
            row.short_open_interest ?? 0
          ),
        0
      ),
    [rows]
  );
  const maxVolume = useMemo(
    () =>
      rows.reduce(
        (max, row) =>
          Math.max(max, row.long_volume_24h ?? 0, row.short_volume_24h ?? 0),
        0
      ),
    [rows]
  );

  const pinnedSet = useMemo(() => new Set(pinnedExchanges), [pinnedExchanges]);

  const toggleExchange = (ex: string) => {
    setSelectedExchanges((prev) =>
      prev.includes(ex) ? prev.filter((e) => e !== ex) : [...prev, ex]
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

  /**
   * Clean up selected exchanges if they're no longer available after data refresh
   * Prevents invalid filter selections when dataset changes
   */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(PINNED_EXCHANGES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPinnedExchanges(parsed.filter((ex): ex is string => typeof ex === "string"));
          return;
        }
      }
      const storedLong = window.localStorage.getItem("arbitrage-pinned-long");
      const storedShort = window.localStorage.getItem("arbitrage-pinned-short");
      const merged = new Set<string>();
      if (storedLong) {
        const parsed = JSON.parse(storedLong);
        if (Array.isArray(parsed)) {
          parsed.filter((ex): ex is string => typeof ex === "string").forEach((ex) => merged.add(ex));
        }
      }
      if (storedShort) {
        const parsed = JSON.parse(storedShort);
        if (Array.isArray(parsed)) {
          parsed.filter((ex): ex is string => typeof ex === "string").forEach((ex) => merged.add(ex));
        }
      }
      if (merged.size > 0) {
        setPinnedExchanges(Array.from(merged));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PINNED_EXCHANGES_KEY, JSON.stringify(pinnedExchanges));
    } catch {
      // ignore
    }
  }, [pinnedExchanges]);

  /**
   * Memoized filtering and sorting of arbitrage opportunities
   * 
   * Process:
   * 1. Text filter: Match token name (base_asset) with normalized search input
   * 2. Exchange filter: Include only rows where BOTH long AND short exchanges are selected
   * 3. OI filter: Exclude opportunities where either side has insufficient open interest
   * 4. Volume filter: Exclude opportunities where either side has insufficient volume
   * 5. Sort: Apply by apr_spread or stability based on sortKey
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

    if (exchanges.length > 0 && selectedExchanges.length === 0) {
      data = [];
    } else if (selectedExchanges.length) {
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

    // MV уже отсортирована по apr_spread desc,
    // но после фильтров порядок может "плыть" — перестрахуемся
    return [...data].sort((a, b) => {
      if (pinnedSet.size > 0) {
        const aPinned = pinnedSet.has(a.long_exchange) || pinnedSet.has(a.short_exchange);
        const bPinned = pinnedSet.has(b.long_exchange) || pinnedSet.has(b.short_exchange);
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
      }
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [rows, search, selectedExchanges, sortKey, sortDir, minOI, minVolume, pinnedSet]);

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
      <div className="rounded-2xl border border-[#343a4e] bg-[#292e40]">
        <div className="flex flex-wrap items-center gap-4 px-4 py-4">
          <h2 className="text-base font-roboto text-white">Opportunities</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <MobileSort
              open={mobileSortOpen}
              onOpenChange={setMobileSortOpen}
              sortKey={sortKey}
              sortDir={sortDir}
              onSelect={setSort}
              className="order-1"
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
              exchangeHeaderExtras={
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={clearPinnedExchanges}
                    disabled={pinnedExchanges.length === 0}
                    className={[
                      "transition",
                      pinnedExchanges.length
                        ? "text-gray-200 underline underline-offset-2"
                        : "text-gray-400/50",
                    ].join(" ")}
                  >
                    Reset pinned
                  </button>
                </div>
              }
              renderExchangeActions={(exchange) => {
                const isPinned = pinnedSet.has(exchange);
                return (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      togglePinned(exchange);
                    }}
                    className={`inline-flex items-center text-[11px] ${
                      isPinned ? "text-[#FA814D]" : "text-gray-500 hover:text-gray-300"
                    }`}
                    aria-label={isPinned ? "Unpin exchange" : "Pin exchange"}
                    title={isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin size={14} className="sm:scale-90" />
                  </button>
                );
              }}
              minOI={minOI}
              onMinOIChange={handleMinOIChange}
              minVolume={minVolume}
              onMinVolumeChange={handleMinVolumeChange}
              maxOI={maxOI}
              maxVolume={maxVolume}
              filtersOpen={filtersOpen}
              onFiltersOpenChange={setFiltersOpen}
              searchPlaceholder="Search asset"
              inputClassName={TAILWIND.input.default}
            />
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm mb-3 px-4 flex items-center gap-2">
            <span>{error}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1 text-gray-300 hover:text-white transition-colors"
              aria-label="Retry loading"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {/* ---------- Loading / Empty (desktop) ---------- */}
        {loading && (
          <div className="hidden min-[960px]:block">
            <TableLoadingState message="Loading arbitrage opportunities…" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="hidden min-[960px]:block">
            <TableEmptyState message="No opportunities for this filter." />
          </div>
        )}

        <ArbitrageMobileCards
          rows={filtered}
          loading={loading}
          onOpenChart={openChart}
          pinnedExchanges={pinnedSet}
        />

        {/* ---------- Table (desktop) ---------- */}
        <div className="hidden min-[960px]:block">
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
                pinnedExchanges={pinnedExchanges}
                onTogglePinned={togglePinned}
                showPins
              />
            </ErrorBoundary>
          )}
        </div>

        {/* ---------- Pagination (desktop) ---------- */}
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

        <ArbitrageChart
          open={chartOpen}
          onClose={() => setChartOpen(false)}
          baseAsset={selectedRow?.base_asset ?? ""}
          longMarketId={selectedRow?.long_market_id ?? 0}
          shortMarketId={selectedRow?.short_market_id ?? 0}
          longExchange={selectedRow?.long_exchange ?? ""}
          shortExchange={selectedRow?.short_exchange ?? ""}
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
          longUrl={selectedRow?.long_url ?? null}
          shortUrl={selectedRow?.short_url ?? null}
          backtesterUrl={selectedRow ? buildBacktesterUrl(selectedRow) : null}
        />

      </div>
    </ErrorBoundary>
  );
}
