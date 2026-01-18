"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { normalizeToken, formatAPR } from "@/lib/formatters";
import { isValidUrl } from "@/lib/validation";
import {
  ExchangeColumn,
  FundingMatrixRow,
  FundingMatrixMarket,
  TimeWindow,
} from "@/lib/types";
import { SCREENER_TIME_WINDOWS, SCREENER_TIME_LABELS } from "@/lib/constants";
import Pagination from "@/components/Table/Pagination";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import { TAILWIND } from "@/lib/theme";
import { withTimeout } from "@/lib/async";

/* ================= TYPES ================= */

type SortKey = "token" | "max_arb";

const TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 2;

/* ================= HELPERS ================= */

/**
 * Calculate max arbitrage spread for a token row
 * Max rate - Min rate = spread
 */
function calculateMaxArb(
  markets: Record<string, FundingMatrixMarket[]> | null | undefined,
  timeWindow: TimeWindow
): number | null {
  if (!markets) return null;

  const rates: number[] = [];

  for (const exchangeMarkets of Object.values(markets)) {
    if (!Array.isArray(exchangeMarkets)) continue;
    for (const market of exchangeMarkets) {
      if (market?.rate !== null && market?.rate !== undefined) {
        rates.push(market.rate);
      }
    }
  }

  if (rates.length < 2) return null;

  const max = Math.max(...rates);
  const min = Math.min(...rates);
  return max - min;
}

/**
 * Check if an exchange has multiple quotes for this token
 */
function hasMultipleQuotes(markets: FundingMatrixMarket[]): boolean {
  if (!markets || markets.length <= 1) return false;
  const quotes = new Set(markets.map((m) => m.quote));
  return quotes.size > 1;
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

  const [sortKey, setSortKey] = useState<SortKey>("max_arb");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(0);

  /* ---------- fetch data ---------- */
  useEffect(() => {
    let cancelled = false;
    let attemptId = 0;

    const fetchExchangeColumns = async (): Promise<ExchangeColumn[]> => {
      const { data, error } = await supabase
        .from("exchange_columns")
        .select("*")
        .order("column_key", { ascending: true });

      if (error) throw new Error(error.message);
      return data as ExchangeColumn[];
    };

    const fetchMatrixData = async (): Promise<FundingMatrixRow[]> => {
      const tableName =
        timeWindow === "now"
          ? "token_funding_matrix_mv"
          : `token_funding_matrix_${timeWindow}_mv`;

      let allRows: FundingMatrixRow[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;

      while (true) {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw new Error(error.message);
        if (!data?.length) break;

        allRows = allRows.concat(data as FundingMatrixRow[]);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      return allRows;
    };

    const load = async () => {
      setLoading(true);
      setError(null);

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const currentAttempt = ++attemptId;

        try {
          const [columns, matrixData] = await Promise.all([
            withTimeout(fetchExchangeColumns(), TIMEOUT_MS),
            withTimeout(fetchMatrixData(), TIMEOUT_MS),
          ]);

          if (!cancelled && currentAttempt === attemptId) {
            setExchangeColumns(columns);
            setRows(matrixData);
            setLoading(false);
          }
          return;
        } catch (err) {
          if (cancelled || currentAttempt !== attemptId) return;

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

    return () => {
      cancelled = true;
    };
  }, [retryToken, timeWindow]);

  /* ---------- handlers ---------- */
  const resetPage = () => setPage(0);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    resetPage();
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
        normalizeToken(row.token ?? "").includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortKey === "token") {
        const aToken = a.token ?? "";
        const bToken = b.token ?? "";
        const cmp = aToken.localeCompare(bToken);
        return sortDir === "asc" ? cmp : -cmp;
      }

      if (sortKey === "max_arb") {
        const aArb = calculateMaxArb(a.markets, timeWindow) ?? -Infinity;
        const bArb = calculateMaxArb(b.markets, timeWindow) ?? -Infinity;
        const cmp = aArb - bArb;
        return sortDir === "asc" ? cmp : -cmp;
      }

      return 0;
    });

    return result;
  }, [rows, search, sortKey, sortDir, timeWindow]);

  /* ---------- pagination ---------- */
  const totalPages = limit === -1 ? 1 : Math.ceil(filtered.length / limit);
  const paginatedRows =
    limit === -1 ? filtered : filtered.slice(page * limit, page * limit + limit);

  /* ---------- arrow indicator ---------- */
  const arrow = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  /* ---------- render ---------- */
  if (loading && rows.length === 0) {
    return (
      <section className="px-6 py-4">
        <SkeletonLoader rows={10} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="px-6 py-4">
        <div className={`rounded-lg ${TAILWIND.bg.surface} p-6 text-center`}>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => setRetryToken((t) => t + 1)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md ${TAILWIND.bg.surface} ${TAILWIND.border.default} ${TAILWIND.text.primary} hover:border-white transition-colors`}
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
      <section className="px-6 py-4">
        {/* ---------- controls ---------- */}
        <div className="flex flex-wrap gap-4 items-center mb-4">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search token..."
            className={`px-3 py-2 rounded-md ${TAILWIND.bg.surface} ${TAILWIND.border.default} ${TAILWIND.text.primary} placeholder-gray-500 focus:outline-none focus:border-white w-48`}
          />

          {/* Time window selector */}
          <div className="flex gap-1 rounded-md overflow-hidden border border-[#343a4e]">
            {SCREENER_TIME_WINDOWS.map((tw) => (
              <button
                key={tw}
                onClick={() => {
                  setTimeWindow(tw);
                  resetPage();
                }}
                className={`px-3 py-2 text-sm transition-colors ${
                  timeWindow === tw
                    ? "bg-[#353b52] text-white"
                    : "bg-[#292e40] text-gray-400 hover:bg-[#353b52] hover:text-white"
                }`}
              >
                {SCREENER_TIME_LABELS[tw]}
              </button>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Pagination controls */}
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

        {/* ---------- table ---------- */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[120px]" /> {/* Asset */}
              <col className="w-[100px]" /> {/* Max Arb */}
              {exchangeColumns.map((col) => (
                <col key={col.column_key} className="w-[120px]" />
              ))}
            </colgroup>

            <thead>
              <tr className="border-b border-[#343a4e]">
                <th
                  className={`${TAILWIND.table.headerFirst} cursor-pointer select-none`}
                  onClick={() => toggleSort("token")}
                >
                  Asset{arrow("token")}
                </th>
                <th
                  className={`${TAILWIND.table.header} cursor-pointer select-none`}
                  onClick={() => toggleSort("max_arb")}
                >
                  Max Arb{arrow("max_arb")}
                </th>
                {exchangeColumns.map((col) => (
                  <th key={col.column_key} className={TAILWIND.table.header}>
                    {col.column_key}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={2 + exchangeColumns.length}
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
                    colSpan={2 + exchangeColumns.length}
                    className="px-4 py-8 text-center text-gray-500 text-sm"
                  >
                    No tokens found
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const maxArb = calculateMaxArb(row.markets, timeWindow);

                  return (
                    <tr
                      key={row.token ?? `row-${idx}`}
                      className={`${TAILWIND.table.row} ${TAILWIND.bg.hover} transition-colors`}
                    >
                      {/* Asset */}
                      <td
                        className={`${TAILWIND.table.cellFirst} font-medium text-white`}
                      >
                        {row.token ?? "–"}
                      </td>

                      {/* Max Arb */}
                      <td
                        className={`${TAILWIND.table.cell} font-mono tabular-nums ${
                          maxArb !== null && maxArb > 0
                            ? "text-emerald-400"
                            : TAILWIND.text.secondary
                        }`}
                      >
                        {maxArb !== null ? formatAPR(maxArb) : "–"}
                      </td>

                      {/* Exchange columns */}
                      {exchangeColumns.map((col) => {
                        const markets = row.markets?.[col.column_key] || [];
                        const showQuote = hasMultipleQuotes(markets);

                        return (
                          <td
                            key={col.column_key}
                            className={`${TAILWIND.table.cell} font-mono tabular-nums`}
                          >
                            {markets.length === 0 ? (
                              <span className="text-gray-600">–</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {markets.map((market) => (
                                  <RateCell
                                    key={market.market_id}
                                    market={market}
                                    showQuote={showQuote}
                                  />
                                ))}
                              </div>
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
          <div className="flex justify-end mt-4">
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
      </section>
    </ErrorBoundary>
  );
}

/* ================= RATE CELL ================= */

function RateCell({
  market,
  showQuote,
}: {
  market: FundingMatrixMarket;
  showQuote: boolean;
}) {
  const rateText =
    market.rate !== null ? formatAPR(market.rate) : "–";

  const rateColor =
    market.rate === null
      ? "text-gray-600"
      : market.rate > 0
      ? "text-emerald-400"
      : market.rate < 0
      ? "text-red-400"
      : "text-gray-400";

  const content = (
    <span className={rateColor}>
      {rateText}
      {showQuote && market.quote && (
        <span className="text-gray-500 text-xs ml-0.5">({market.quote})</span>
      )}
    </span>
  );

  if (isValidUrl(market.ref_url)) {
    return (
      <a
        href={market.ref_url!}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        {content}
      </a>
    );
  }

  return content;
}
