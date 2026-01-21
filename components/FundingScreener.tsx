"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ChevronDown, Search, X } from "lucide-react";
import { normalizeToken, formatAPR, formatExchange } from "@/lib/formatters";
import { getRate, calculateMaxArb, findArbPair } from "@/lib/funding";
import {
  ExchangeColumn,
  FundingMatrixRow,
  TimeWindow,
  SortDir,
} from "@/lib/types";
import { SCREENER_TIME_WINDOWS, SCREENER_TIME_LABELS } from "@/lib/constants";
import { getLocalCache, setLocalCache, withTimeout } from "@/lib/async";
import Pagination from "@/components/Table/Pagination";
import ExchangeFilter from "@/components/Table/ExchangeFilter";
import APRRangeFilter from "@/components/Table/APRRangeFilter";
import RateCell from "@/components/FundingScreener/RateCell";
import APRCell from "@/components/FundingScreener/APRCell";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import SortableHeader from "@/components/ui/SortableHeader";
import ExchangeIcon from "@/components/ui/ExchangeIcon";
import { TAILWIND } from "@/lib/theme";

/* ================= TYPES ================= */

type SortKey = "token" | "max_arb" | string; // string for exchange column_keys

const TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 2;
const FAVORITES_KEY = "funding-screener-favorites";
const EXCHANGES_KEY = "funding-screener-exchanges";
const CACHE_KEY = "cache-funding-screener-data";
const CACHE_TTL_MS = 3 * 60 * 1000;

/* ================= HELPERS ================= */
function formatColumnHeader(col: ExchangeColumn, exchangesWithMultipleQuotes: Set<string>): string {
  const name = formatExchange(col.exchange);
  if (exchangesWithMultipleQuotes.has(col.exchange)) {
    return `${name} (${col.quote_asset})`;
  }
  return name;
}

function GradientStar({ filled = false, size = 14 }: { filled?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "url(#navUnderlineGradient)" : "none"}
      stroke="url(#navUnderlineGradient)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  );
}

/* ================= COMPONENT ================= */

export default function FundingScreener() {
  /* ---------- state ---------- */
  const [rows, setRows] = useState<FundingMatrixRow[]>([]);
  const [exchangeColumns, setExchangeColumns] = useState<ExchangeColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const [search, setSearch] = useState("");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("now");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exchangesInitialized, setExchangesInitialized] = useState(false);
  const [minAPR, setMinAPR] = useState<number | "">(0);
  const [maxAPRFilter, setMaxAPRFilter] = useState<number | "">("");
  const [favoriteTokens, setFavoriteTokens] = useState<string[]>([]);

  const [sortKey, setSortKey] = useState<SortKey>("max_arb");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(0);

  /* ---------- fetch data ---------- */
  useEffect(() => {
    let cancelled = false;
    let attemptId = 0;

    const cached = getLocalCache<{ columns: ExchangeColumn[]; rows: FundingMatrixRow[] }>(
      CACHE_KEY,
      CACHE_TTL_MS
    );
    const hasCache = !!cached && cached.rows.length > 0 && cached.columns.length > 0;
    if (hasCache) {
      setExchangeColumns(cached!.columns);
      setRows(cached!.rows);
      setLoading(false);
      setError(null);
    }

    const fetchScreenerData = async (): Promise<{ columns: ExchangeColumn[]; rows: FundingMatrixRow[] }> => {
      const res = await fetch("/api/dashboard?type=screener", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load funding screener data");
      }
      const json = (await res.json()) as {
        columns?: ExchangeColumn[];
        rows?: FundingMatrixRow[];
      };
      return {
        columns: json.columns ?? [],
        rows: json.rows ?? [],
      };
    };

    const load = async () => {
      setLoading(!hasCache);
      setError(null);

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const currentAttempt = ++attemptId;
        try {
          const { columns, rows: matrixData } = await withTimeout(
            fetchScreenerData(),
            TIMEOUT_MS
          );

          if (!cancelled && currentAttempt === attemptId) {
            setExchangeColumns(columns);
            setRows(matrixData);
            setLoading(false);
            setLocalCache(CACHE_KEY, { columns, rows: matrixData });
          }
          return;
        } catch (err) {
          if (cancelled || currentAttempt !== attemptId) return;

          if (hasCache) {
            setLoading(false);
            return;
          }
          if (err instanceof Error && err.message === "timeout") {
            if (attempt < MAX_ATTEMPTS - 1) continue;
            setError("Error loading data: Request timed out");
          } else {
            const message = err instanceof Error ? err.message : "Unknown error";
            setError(`Error loading data: ${message}`);
          }
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [retryToken]);

  /* ---------- derived data ---------- */
  const exchanges = useMemo(
    () => Array.from(new Set(exchangeColumns.map((c) => c.exchange))).sort(),
    [exchangeColumns]
  );

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(FAVORITES_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setFavoriteTokens(parsed.filter((token): token is string => typeof token === "string"));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteTokens));
    } catch {
      // ignore storage errors
    }
  }, [favoriteTokens]);

  const favoriteSet = useMemo(() => new Set(favoriteTokens), [favoriteTokens]);

  const exchangesWithMultipleQuotes = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const col of exchangeColumns) {
      counts[col.exchange] = (counts[col.exchange] || 0) + 1;
    }
    return new Set(Object.entries(counts).filter(([, c]) => c > 1).map(([e]) => e));
  }, [exchangeColumns]);

  const filteredColumns = useMemo(() => {
    if (selectedExchanges.length === 0) return [];
    return exchangeColumns.filter((col) =>
      selectedExchanges.includes(col.exchange)
    );
  }, [exchangeColumns, selectedExchanges]);

  // Set of column keys from filtered exchanges for max arb calculation
  const filteredColumnKeys = useMemo(() => {
    return new Set(filteredColumns.map((col) => col.column_key));
  }, [filteredColumns]);

  /* ---------- max APR for slider ---------- */
  const maxAPRValue = useMemo(() => {
    let max = 0;
    for (const row of rows) {
      const arb = calculateMaxArb(row.markets, timeWindow, filteredColumnKeys);
      if (arb !== null && arb > max) max = arb;
    }
    return Math.ceil(max);
  }, [rows, timeWindow, filteredColumnKeys]);

  /* ---------- handlers ---------- */
  const resetPage = () => setPage(0);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    resetPage();
  };

  const handleMinAPRChange = (value: number | "") => {
    setMinAPR(value);
    resetPage();
  };

  const handleMaxAPRFilterChange = (value: number | "") => {
    setMaxAPRFilter(value);
    resetPage();
  };

  const toggleFavorite = (token?: string | null) => {
    if (!token) return;
    setFavoriteTokens((prev) =>
      prev.includes(token)
        ? prev.filter((t) => t !== token)
        : [token, ...prev]
    );
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    resetPage();
  };

  /* ---------- filtered & sorted ---------- */
  const filtered = useMemo(() => {
    let result = [...rows];

    // Filter by search
    if (search.trim()) {
      const term = normalizeToken(search.trim());
      result = result.filter((row) =>
        normalizeToken(row.token ?? "").startsWith(term)
      );
    }

    // Filter by exchanges (empty selection = no rows)
    if (exchanges.length > 0 && selectedExchanges.length === 0) {
      return [];
    }

    // Filter by min APR (using filtered exchanges)
    if (typeof minAPR === "number" && minAPR > 0) {
      result = result.filter((row) => {
        const maxArb = calculateMaxArb(row.markets, timeWindow, filteredColumnKeys);
        return maxArb !== null && maxArb >= minAPR;
      });
    }

    // Filter by max APR (using filtered exchanges)
    if (typeof maxAPRFilter === "number") {
      result = result.filter((row) => {
        const maxArb = calculateMaxArb(row.markets, timeWindow, filteredColumnKeys);
        return maxArb === null || maxArb <= maxAPRFilter;
      });
    }

    // Sort
    result.sort((a, b) => {
      const aFav = a.token ? favoriteSet.has(a.token) : false;
      const bFav = b.token ? favoriteSet.has(b.token) : false;
      if (aFav !== bFav) return aFav ? -1 : 1;

      if (sortKey === "token") {
        const aToken = a.token ?? "";
        const bToken = b.token ?? "";
        const cmp = aToken.localeCompare(bToken);
        return sortDir === "asc" ? cmp : -cmp;
      }

      if (sortKey === "max_arb") {
        const aArb = calculateMaxArb(a.markets, timeWindow, filteredColumnKeys) ?? -Infinity;
        const bArb = calculateMaxArb(b.markets, timeWindow, filteredColumnKeys) ?? -Infinity;
        const cmp = aArb - bArb;
        return sortDir === "asc" ? cmp : -cmp;
      }

      // Sort by exchange column
      const aRate = getRate(a.markets?.[sortKey], timeWindow) ?? -Infinity;
      const bRate = getRate(b.markets?.[sortKey], timeWindow) ?? -Infinity;
      const cmp = aRate - bRate;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [rows, search, sortKey, sortDir, timeWindow, minAPR, maxAPRFilter, favoriteSet, filteredColumnKeys]);

  /* ---------- pagination ---------- */
  const totalPages = limit === -1 ? 1 : Math.ceil(filtered.length / limit);
  const paginatedRows =
    limit === -1 ? filtered : filtered.slice(page * limit, page * limit + limit);

  /* ---------- render ---------- */
  if (error) {
    return (
      <section className="py-4">
        <div className={`rounded-lg ${TAILWIND.bg.surface} p-6 text-center`}>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => setRetryToken((t) => t + 1)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${TAILWIND.bg.surface} ${TAILWIND.border.default} ${TAILWIND.text.primary} hover:border-white transition-colors`}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <ErrorBoundary>
      <section className="py-4">
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="navUnderlineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9E5DEE" />
              <stop offset="100%" stopColor="#FA814D" />
            </linearGradient>
          </defs>
        </svg>
        {/* ---------- table wrapper ---------- */}
        <div className="rounded-2xl border border-[#343a4e] bg-[#292e40]">
          {/* ---------- header row with controls ---------- */}
          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
            <h2 className="text-base font-roboto text-white">Screener</h2>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto sm:ml-auto">
              {/* Time window dropdown */}
              <div className="relative">
                <select
                  className="appearance-none bg-transparent border border-[#343a4e] rounded-lg pl-3 pr-7 py-2 text-sm text-gray-200 focus:outline-none cursor-pointer"
                  value={timeWindow}
                  onChange={(e) => {
                    setTimeWindow(e.target.value as TimeWindow);
                    resetPage();
                  }}
                >
                  {SCREENER_TIME_WINDOWS.map((tw) => (
                    <option key={tw} value={tw}>
                      {SCREENER_TIME_LABELS[tw]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Filters dropdown with slider */}
              <APRRangeFilter
                minAPR={minAPR}
                maxAPRFilter={maxAPRFilter}
                onMinAPRChange={handleMinAPRChange}
                onMaxAPRFilterChange={handleMaxAPRFilterChange}
                maxAPR={maxAPRValue}
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
              />

              {/* Exchange filter */}
              <ExchangeFilter
                exchanges={exchanges}
                selectedExchanges={selectedExchanges}
                onToggleExchange={(exchange) => {
                  setSelectedExchanges((prev) =>
                    prev.includes(exchange)
                      ? prev.filter((e) => e !== exchange)
                      : [...prev, exchange]
                  );
                  resetPage();
                }}
                onCheckAll={() => {
                  setSelectedExchanges(exchanges);
                  resetPage();
                }}
                onUncheckAll={() => {
                  setSelectedExchanges([]);
                  resetPage();
                }}
                open={filterOpen}
                onOpenChange={setFilterOpen}
              />

              {/* Search */}
              <div className="relative w-full order-last sm:order-none sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white w-4 h-4" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search asset"
                  className={`${TAILWIND.input.default} pl-10 pr-9 bg-transparent border border-[#383d50] focus:bg-transparent focus:border-[#383d50]`}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-[#383d50] border border-[#343a4e] text-gray-300 text-xs leading-none flex items-center justify-center transition-colors duration-200 hover:border-white hover:text-white"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ---------- table ---------- */}
          <div className="overflow-x-auto">
            <table className="table-fixed w-max border-collapse text-xs whitespace-nowrap">
              <colgroup>
                <col className="w-[48px]" />
                <col className="w-[90px]" />
                <col className="w-[80px]" />
                {filteredColumns.map((col) => (
                  <col key={col.column_key} className="w-[75px]" />
                ))}
              </colgroup>

              <thead>
                <tr className="border-b border-[#343a4e] bg-[#292e40]">
                  <th className={`${TAILWIND.table.header} text-center md:sticky md:left-0 md:z-10 bg-[#292e40]`}>
                    <span className="inline-flex w-full justify-center">
                      <GradientStar filled size={14} />
                    </span>
                  </th>
                  <th className={`${TAILWIND.table.header} md:sticky md:left-[48px] md:z-10 bg-[#292e40]`}>
                    <SortableHeader
                      label="Asset"
                      active={sortKey === "token"}
                      dir={sortDir}
                      onClick={() => toggleSort("token")}
                    />
                  </th>
                  <th className={`${TAILWIND.table.header} text-right md:sticky md:left-[138px] md:z-10 bg-[#292e40]`}>
                    <SortableHeader
                      label="APR"
                      active={sortKey === "max_arb"}
                      dir={sortDir}
                      onClick={() => toggleSort("max_arb")}
                    />
                  </th>
                  {filteredColumns.map((col) => (
                    <th key={col.column_key} className={`${TAILWIND.table.header} text-center whitespace-nowrap`}>
                      <div className="flex flex-col items-center gap-1">
                        <ExchangeIcon exchange={col.exchange} size={22} />
                        <SortableHeader
                          label={formatColumnHeader(col, exchangesWithMultipleQuotes)}
                          active={sortKey === col.column_key}
                          dir={sortDir}
                          onClick={() => toggleSort(col.column_key)}
                          centered
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={3 + filteredColumns.length}
                      className="px-4 py-8 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                        <span className="h-4 w-4 rounded-full border-2 border-gray-600 border-t-blue-400 animate-spin" />
                        Refreshing data...
                      </div>
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3 + filteredColumns.length}
                      className="px-4 py-8 text-center text-gray-500 text-sm"
                    >
                      No tokens found
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const maxArb = calculateMaxArb(row.markets, timeWindow, filteredColumnKeys);
                    const arbPair = findArbPair(row.markets, timeWindow, filteredColumnKeys);

                    return (
                      <tr
                        key={row.token ?? `row-${idx}`}
                        className="border-b border-[#343a4e] last:border-b-0 hover:bg-[#353b52] transition-colors group"
                      >
                        {/* Favorite - sticky */}
                        <td className="px-4 py-2 text-center md:sticky md:left-0 md:z-10 bg-[#292e40] group-hover:bg-[#353b52] transition-colors">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(row.token);
                            }}
                            disabled={!row.token}
                            className="inline-flex items-center justify-center disabled:opacity-40"
                            aria-label={favoriteSet.has(row.token ?? "") ? "Remove from favorites" : "Add to favorites"}
                          >
                            <GradientStar filled={favoriteSet.has(row.token ?? "")} size={14} />
                          </button>
                        </td>
                        {/* Asset - sticky */}
                        <td className="px-4 py-2 font-medium text-white md:sticky md:left-[48px] md:z-10 bg-[#292e40] group-hover:bg-[#353b52] transition-colors">
                          {row.token ?? "–"}
                        </td>

                        {/* APR - sticky */}
                        <td
                          className={`px-4 py-2 text-right font-mono tabular-nums md:sticky md:left-[138px] md:z-10 bg-[#292e40] group-hover:bg-[#353b52] transition-colors`}
                        >
                          <APRCell maxArb={maxArb} arbPair={arbPair} token={row.token} />
                        </td>

                        {/* Exchange columns */}
                        {filteredColumns.map((col) => {
                          const market = row.markets?.[col.column_key];
                          const rate = getRate(market, timeWindow);
                          // Determine if this column is used for APR calculation
                          const role = arbPair
                            ? col.column_key === arbPair.longKey
                              ? "long"
                              : col.column_key === arbPair.shortKey
                              ? "short"
                              : undefined
                            : undefined;

                          return (
                            <td
                              key={col.column_key}
                              className="px-2 py-2 text-right font-mono tabular-nums"
                            >
                              {!market ? (
                                <span className="text-gray-600 block text-center">–</span>
                              ) : (
                                <RateCell market={market} rate={rate} token={row.token} role={role} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ---------- bottom pagination ---------- */}
          {paginatedRows.length > 0 && (
            <div className="px-4 py-3 border-t border-[#343a4e]">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  resetPage();
                }}
                showPagination={limit !== -1}
              />
            </div>
          )}
        </div>
      </section>
    </ErrorBoundary>
  );
}
