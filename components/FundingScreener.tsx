"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, ChevronDown, Search, X, Pin, Info } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeToken, formatExchange } from "@/lib/formatters";
import {
  getRate,
  findArbPairPinnedWithForcedSides,
  calculateMaxArbPinnedWithForcedSides,
  buildBacktesterUrl,
  ArbPair,
} from "@/lib/funding";
import {
  ExchangeColumn,
  FundingMatrixRow,
  FundingMatrixMarket,
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
import FundingScreenerMobileCards from "@/components/FundingScreener/MobileCards";
import FundingScreenerMobileSort from "@/components/FundingScreener/MobileSort";
import GmxRateCell from "@/components/FundingScreener/GmxRateCell";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import SortableHeader from "@/components/ui/SortableHeader";
import ExchangeIcon from "@/components/ui/ExchangeIcon";
import { TAILWIND } from "@/lib/theme";

const ArbitrageChart = dynamic(() => import("@/components/ArbitrageChart"), {
  ssr: false,
});

/* ================= TYPES ================= */

type SortKey = "token" | "max_arb" | string; // string for exchange column_keys

const TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 2;
const FAVORITES_KEY = "funding-screener-favorites";
const EXCHANGES_KEY = "funding-screener-exchanges";
const PINNED_KEY = "funding-screener-pinned";
const PINNED_QUERY_KEY = "pinned";
const CACHE_KEY = "cache-funding-screener-data";
const CACHE_TTL_MS = 3 * 60 * 1000;
const GMX_EXCHANGE = "gmx";

type DisplayColumn = ExchangeColumn & {
  isGmxGroup?: boolean;
};

/* ================= HELPERS ================= */
function formatColumnHeader(col: ExchangeColumn, exchangesWithMultipleQuotes: Set<string>): string {
  const name = formatExchange(col.exchange);
  if (col.exchange.toLowerCase() === GMX_EXCHANGE) {
    return name;
  }
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
function toPinnedParam(col: ExchangeColumn, exchangesWithMultipleQuotes: Set<string>) {
  const exchange = col.exchange.toLowerCase();
  if (exchangesWithMultipleQuotes.has(col.exchange)) {
    return `${exchange}${col.quote_asset.toLowerCase()}`;
  }
  return exchange;
}

function normalizePinnedParam(value: string) {
  return value.trim().toLowerCase();
}

function GmxInfo() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [tooltipShiftX, setTooltipShiftX] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTooltip) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setShowTooltip(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTooltip]);

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setTooltipPos({
      top: rect.top,
      left: rect.left + rect.width / 2,
    });
    setTooltipShiftX(0);
  };

  const handleClick = (event: ReactMouseEvent) => {
    event.stopPropagation();
    if (!showTooltip && buttonRef.current) {
      updatePosition();
      setShowTooltip(true);
      return;
    }
    setShowTooltip(false);
  };

  useEffect(() => {
    if (!showTooltip) return;
    const handleUpdate = () => updatePosition();
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);
    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [showTooltip]);

  useEffect(() => {
    if (!showTooltip || !tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    let shift = 0;
    if (rect.left < 8) {
      shift = 8 - rect.left;
    } else if (rect.right > viewportWidth - 8) {
      shift = (viewportWidth - 8) - rect.right;
    }
    if (shift !== tooltipShiftX) {
      setTooltipShiftX(shift);
    }
  }, [showTooltip, tooltipShiftX]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className="text-gray-500 hover:text-gray-300 transition-colors"
        aria-label="GMX info"
      >
        <Info size={12} />
      </button>
      {showTooltip && tooltipPos && typeof window !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              transform: `translate(-50%, calc(-100% - 8px)) translateX(${tooltipShiftX}px)`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[9999] w-64 max-w-[calc(100vw-32px)] p-3 rounded-lg bg-[#292e40] border border-[#343a4e] shadow-xl text-xs text-gray-300 leading-relaxed text-left animate-tooltip-zoom pointer-events-auto"
          >
            <p>
              GMX uses separate funding rates for longs and shorts. Use this toggle to switch between them.
            </p>
            <div
              style={{ left: `calc(50% - ${tooltipShiftX}px)` }}
              className="absolute bottom-0 translate-y-full -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#343a4e]"
            />
          </div>,
          document.body
        )}
    </>
  );
}

/* ================= COMPONENT ================= */

export default function FundingScreener({
  initialColumns = [],
  initialRows = [],
}: {
  initialColumns?: ExchangeColumn[];
  initialRows?: FundingMatrixRow[];
}) {
  /* ---------- state ---------- */
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialHasData = initialColumns.length > 0 && initialRows.length > 0;
  const [rows, setRows] = useState<FundingMatrixRow[]>(initialRows);
  const [exchangeColumns, setExchangeColumns] = useState<ExchangeColumn[]>(initialColumns);
  const [loading, setLoading] = useState(!initialHasData);
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
  const [pinnedColumnKey, setPinnedColumnKey] = useState<string | null>(null);
  const [pinnedInitialized, setPinnedInitialized] = useState(false);
  const [pinnedDirty, setPinnedDirty] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [gmxSelectionByToken, setGmxSelectionByToken] = useState<Record<string, string>>({});
  const [gmxPreferredSide, setGmxPreferredSide] = useState<"long" | "short">("short");
  const [gmxSideLocked, setGmxSideLocked] = useState(false);
  const [modalData, setModalData] = useState<{
    token: string;
    arbPair: ArbPair;
    maxArb: number | null;
  } | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("max_arb");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const openModal = (payload: {
    token: string;
    arbPair: ArbPair;
    maxArb: number | null;
  }) => {
    setModalData(payload);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalData(null);
  };

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
    const hasInitial = initialColumns.length > 0 && initialRows.length > 0;
    if (hasCache) {
      setExchangeColumns(cached!.columns);
      setRows(cached!.rows);
      setLoading(false);
      setError(null);
    } else if (hasInitial) {
      setExchangeColumns(initialColumns);
      setRows(initialRows);
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
      setLoading(!(hasCache || hasInitial));
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

          if (hasCache || hasInitial) {
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
  }, [retryToken, initialColumns, initialRows]);

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
    const multi = Object.entries(counts)
      .filter(([, c]) => c > 1)
      .map(([e]) => e);
    return new Set(multi.filter((e) => e.toLowerCase() !== GMX_EXCHANGE));
  }, [exchangeColumns]);

  const columnKeysByExchange = useMemo(() => {
    const map = new Map<string, ExchangeColumn[]>();
    for (const col of exchangeColumns) {
      if (!map.has(col.exchange)) {
        map.set(col.exchange, []);
      }
      map.get(col.exchange)!.push(col);
    }
    return map;
  }, [exchangeColumns]);

  const filteredColumnsAll = useMemo(() => {
    if (selectedExchanges.length === 0) return [];
    return exchangeColumns.filter((col) =>
      selectedExchanges.includes(col.exchange)
    );
  }, [exchangeColumns, selectedExchanges]);

  const gmxColumns = useMemo(
    () =>
      filteredColumnsAll.filter(
        (col) => col.exchange.toLowerCase() === GMX_EXCHANGE
      ),
    [filteredColumnsAll]
  );

  const displayColumns = useMemo(() => {
    const columns: DisplayColumn[] = [];
    let gmxInserted = false;
    for (const col of filteredColumnsAll) {
      if (col.exchange.toLowerCase() === GMX_EXCHANGE) {
        if (!gmxInserted) {
          columns.push({ ...col, isGmxGroup: true });
          gmxInserted = true;
        }
        continue;
      }
      columns.push(col);
    }
    return columns;
  }, [filteredColumnsAll]);

  const gmxDisplayColumnKey = useMemo(
    () => displayColumns.find((col) => col.isGmxGroup)?.column_key ?? null,
    [displayColumns]
  );

  const pinnedParamByColumnKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of exchangeColumns) {
      map.set(col.column_key, toPinnedParam(col, exchangesWithMultipleQuotes));
    }
    return map;
  }, [exchangeColumns, exchangesWithMultipleQuotes]);

  const columnKeyByPinnedParam = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of exchangeColumns) {
      map.set(toPinnedParam(col, exchangesWithMultipleQuotes), col.column_key);
    }
    if (gmxDisplayColumnKey) {
      map.set(GMX_EXCHANGE, gmxDisplayColumnKey);
    }
    return map;
  }, [exchangeColumns, exchangesWithMultipleQuotes, gmxDisplayColumnKey]);

  // Set of column keys from filtered exchanges for max arb calculation
  const filteredColumnKeys = useMemo(() => {
    return new Set(filteredColumnsAll.map((col) => col.column_key));
  }, [filteredColumnsAll]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (columnKeyByPinnedParam.size === 0) return;
    try {
      const pinnedParam = searchParams.get(PINNED_QUERY_KEY);
      if (pinnedParam) {
        const normalized = normalizePinnedParam(pinnedParam);
        const keyFromParam = columnKeyByPinnedParam.get(normalized);
        if (keyFromParam) {
          setPinnedColumnKey(keyFromParam);
          return;
        }
      }
      const stored = window.localStorage.getItem(PINNED_KEY);
      if (!stored) return;
      setPinnedColumnKey(stored);
    } catch {
      // ignore
    } finally {
      setPinnedInitialized(true);
    }
  }, [searchParams, columnKeyByPinnedParam]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pinnedInitialized) return;
    if (!pinnedDirty && !pinnedColumnKey) return;
    try {
      if (!pinnedColumnKey) {
        window.localStorage.removeItem(PINNED_KEY);
      } else {
        window.localStorage.setItem(PINNED_KEY, pinnedColumnKey);
      }
    } catch {
      // ignore
    }
  }, [pinnedColumnKey, pinnedDirty, pinnedInitialized]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pinnedInitialized) return;
    if (!pinnedDirty && !pinnedColumnKey) return;
    const url = new URL(window.location.href);
    const pinnedParam = pinnedColumnKey
      ? pinnedParamByColumnKey.get(pinnedColumnKey)
      : null;
    if (pinnedParam) {
      url.searchParams.set(PINNED_QUERY_KEY, pinnedParam);
    } else {
      url.searchParams.delete(PINNED_QUERY_KEY);
    }
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    if (nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      router.replace(nextUrl);
    }
  }, [pinnedColumnKey, pinnedDirty, pinnedParamByColumnKey, pinnedInitialized, router]);

  useEffect(() => {
    if (!pinnedInitialized) return;
    if (!pinnedColumnKey) return;
    if (filteredColumnKeys.size === 0) return;
    if (!filteredColumnKeys.has(pinnedColumnKey)) {
      setPinnedColumnKey(null);
    }
  }, [pinnedColumnKey, filteredColumnKeys, pinnedInitialized]);

  const gmxOptionsByToken = useMemo(() => {
    const map = new Map<
      string,
      {
        columnKey: string;
        quote: string;
        side: "long" | "short" | null;
        market: FundingMatrixMarket;
        rate: number | null;
      }[]
    >();
    if (gmxColumns.length === 0) return map;

    const parseSide = (columnKey: string, market: FundingMatrixMarket) => {
      const marketLabel =
        ((market as unknown as { market?: string; symbol?: string }).market ??
          (market as unknown as { market?: string; symbol?: string }).symbol ??
          "")
          .toString();
      const marketMatch = marketLabel.match(/\b(LONG|SHORT)\b/i);
      if (marketMatch) {
        return marketMatch[1].toLowerCase() as "long" | "short";
      }
      const keyMatch = columnKey.match(/\b(LONG|SHORT)\b/i);
      if (keyMatch) {
        return keyMatch[1].toLowerCase() as "long" | "short";
      }
      return null;
    };

    for (const row of rows) {
      if (!row.token) continue;
      let options = gmxColumns
        .map((col) => {
          const market = row.markets?.[col.column_key];
          if (!market) return null;
          return {
            columnKey: col.column_key,
            quote: col.quote_asset,
            side: parseSide(col.column_key, market),
            market,
            rate: getRate(market, timeWindow),
          };
        })
        .filter(Boolean) as {
        columnKey: string;
        quote: string;
        side: "long" | "short" | null;
        market: FundingMatrixMarket;
        rate: number | null;
      }[];

      if (options.length === 0 && row.markets) {
        options = Object.entries(row.markets)
          .filter(([, market]) => market?.exchange?.toLowerCase() === GMX_EXCHANGE)
          .map(([key, market]) => ({
            columnKey: key,
            quote: market.quote ?? "",
            side: parseSide(key, market),
            market,
            rate: getRate(market, timeWindow),
          }));
      }

      map.set(row.token, options);
    }
    return map;
  }, [rows, gmxColumns, timeWindow]);

  const gmxColumnKeySet = useMemo(() => {
    const set = new Set(gmxColumns.map((col) => col.column_key));
    for (const options of gmxOptionsByToken.values()) {
      for (const option of options) {
        set.add(option.columnKey);
      }
    }
    return set;
  }, [gmxColumns, gmxOptionsByToken]);

  const gmxDefaultKeyByToken = useMemo(() => {
    const map = new Map<string, string>();
    for (const [token, options] of gmxOptionsByToken.entries()) {
      if (options.length === 0) continue;
      const shortOptions = options.filter((opt) => opt.side === "short");
      const pool = shortOptions.length > 0 ? shortOptions : options;
      let best = pool[0];
      for (const option of pool) {
        const oi = option.market?.open_interest ?? -Infinity;
        const bestOi = best.market?.open_interest ?? -Infinity;
        if (oi > bestOi) best = option;
      }
      map.set(token, best.columnKey);
    }
    return map;
  }, [gmxOptionsByToken]);

  const getPreferredColumnKey = (exchange: string) => {
    const lower = exchange.toLowerCase();
    if (lower === GMX_EXCHANGE && gmxDisplayColumnKey) {
      return gmxDisplayColumnKey;
    }
    const cols = columnKeysByExchange.get(exchange);
    if (!cols || cols.length === 0) return null;
    const usdt = cols.find((col) => col.quote_asset.toLowerCase() === "usdt");
    return (usdt ?? cols[0]).column_key;
  };

  const getGmxSelectedKey = (
    token: string | null | undefined,
    options: { columnKey: string }[]
  ) => {
    if (!token) return null;
    const stored = gmxSelectionByToken[token];
    if (stored && options.some((opt) => opt.columnKey === stored)) {
      return stored;
    }
    const fallback = gmxDefaultKeyByToken.get(token);
    if (fallback && options.some((opt) => opt.columnKey === fallback)) {
      return fallback;
    }
    return options[0]?.columnKey ?? null;
  };

  const setGmxSelectedKey = (token: string | null | undefined, key: string) => {
    if (!token) return;
    setGmxSelectionByToken((prev) => ({ ...prev, [token]: key }));
  };

  const resolveGmxKeyForSide = (
    options: { columnKey: string; quote: string; side: "long" | "short" | null }[],
    currentKey: string | null | undefined,
    side: "long" | "short"
  ) => {
    if (options.length === 0) return null;
    const current =
      options.find((opt) => opt.columnKey === currentKey) ?? options[0];
    const sameQuote = options.find(
      (opt) => opt.quote === current.quote && opt.side === side
    );
    const preferred =
      sameQuote ?? options.find((opt) => opt.side === side) ?? current;
    return preferred.columnKey;
  };

  const applyGmxSide = (side: "long" | "short") => {
    setGmxSideLocked(true);
    setGmxPreferredSide(side);
    if (gmxOptionsByToken.size === 0) return;
    setGmxSelectionByToken((prev) => {
      const next = { ...prev };
      for (const [token, options] of gmxOptionsByToken.entries()) {
        if (options.length === 0) continue;
        const currentKey =
          prev[token] ??
          gmxDefaultKeyByToken.get(token) ??
          options[0]?.columnKey;
        const resolved = resolveGmxKeyForSide(options, currentKey, side);
        if (resolved) next[token] = resolved;
      }
      return next;
    });
  };

  useEffect(() => {
    if (!gmxSideLocked) return;
    if (gmxOptionsByToken.size === 0) return;
    setGmxSelectionByToken((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [token, options] of gmxOptionsByToken.entries()) {
        if (options.length === 0) continue;
        const currentKey =
          prev[token] ??
          gmxDefaultKeyByToken.get(token) ??
          options[0]?.columnKey;
        const resolved = resolveGmxKeyForSide(
          options,
          currentKey,
          gmxPreferredSide
        );
        if (resolved && resolved !== prev[token]) {
          next[token] = resolved;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [gmxOptionsByToken, gmxDefaultKeyByToken, gmxPreferredSide, gmxSideLocked]);

  const getPinnedKeyForRow = (row: FundingMatrixRow) => {
    if (!pinnedColumnKey) return null;
    if (!gmxColumnKeySet.has(pinnedColumnKey)) return pinnedColumnKey;
    const options = gmxOptionsByToken.get(row.token ?? "") ?? [];
    return getGmxSelectedKey(row.token, options) ?? pinnedColumnKey;
  };

  const getColumnKeysForRow = (row: FundingMatrixRow) => {
    if (gmxColumnKeySet.size === 0) return filteredColumnKeys;
    const next = new Set(filteredColumnKeys);
    for (const key of gmxColumnKeySet) {
      next.delete(key);
    }
    const options = gmxOptionsByToken.get(row.token ?? "") ?? [];
    const selectedKey = getGmxSelectedKey(row.token, options);
    if (selectedKey) {
      next.add(selectedKey);
    }
    return next;
  };

  const getForcedSidesForRow = (row: FundingMatrixRow) => {
    const options = gmxOptionsByToken.get(row.token ?? "") ?? [];
    const selectedKey = getGmxSelectedKey(row.token, options);
    const selectedOption = options.find((opt) => opt.columnKey === selectedKey);
    if (!selectedOption?.side) return null;
    return new Map([[selectedOption.columnKey, selectedOption.side]]);
  };

  /* ---------- max APR for slider ---------- */
  const maxAPRValue = useMemo(() => {
    let max = 0;
    for (const row of rows) {
      const pinnedKey = getPinnedKeyForRow(row);
      const columnKeys = getColumnKeysForRow(row);
      const forcedSides = getForcedSidesForRow(row) ?? undefined;
      const arb = calculateMaxArbPinnedWithForcedSides(
        row.markets,
        timeWindow,
        columnKeys,
        pinnedKey,
        forcedSides
      );
      if (arb !== null && arb > max) max = arb;
    }
    return Math.ceil(max);
  }, [rows, timeWindow, filteredColumnKeys, pinnedColumnKey, gmxColumnKeySet, gmxOptionsByToken, gmxSelectionByToken, gmxDefaultKeyByToken]);

  const maxArbByRow = useMemo(() => {
    const map = new Map<FundingMatrixRow, number | null>();
    for (const row of rows) {
      const pinnedKey = getPinnedKeyForRow(row);
      const columnKeys = getColumnKeysForRow(row);
      const forcedSides = getForcedSidesForRow(row) ?? undefined;
      map.set(
        row,
        calculateMaxArbPinnedWithForcedSides(
          row.markets,
          timeWindow,
          columnKeys,
          pinnedKey,
          forcedSides
        )
      );
    }
    return map;
  }, [rows, timeWindow, filteredColumnKeys, pinnedColumnKey, gmxColumnKeySet, gmxOptionsByToken, gmxSelectionByToken, gmxDefaultKeyByToken]);

  const getMaxArb = (row: FundingMatrixRow) => maxArbByRow.get(row) ?? null;

  const columnLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of filteredColumnsAll) {
      map.set(col.column_key, formatColumnHeader(col, exchangesWithMultipleQuotes));
    }
    return map;
  }, [filteredColumnsAll, exchangesWithMultipleQuotes]);

  const modalBacktesterUrl =
    modalData && modalData.token
      ? buildBacktesterUrl(modalData.token, modalData.arbPair)
      : null;
  const modalLongLabel = modalData
    ? columnLabelByKey.get(modalData.arbPair.longKey) ??
      formatExchange(modalData.arbPair.longMarket.exchange)
    : "";
  const modalShortLabel = modalData
    ? columnLabelByKey.get(modalData.arbPair.shortKey) ??
      formatExchange(modalData.arbPair.shortMarket.exchange)
    : "";

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

  const setSort = (key: SortKey, dir: SortDir) => {
    setSortKey(key);
    setSortDir(dir);
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
        const maxArb = getMaxArb(row);
        return maxArb !== null && maxArb >= minAPR;
      });
    }

    // Filter by max APR (using filtered exchanges)
    if (typeof maxAPRFilter === "number") {
      result = result.filter((row) => {
        const maxArb = getMaxArb(row);
        return maxArb === null || maxArb <= maxAPRFilter;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (pinnedColumnKey) {
        const aKey = getPinnedKeyForRow(a);
        const bKey = getPinnedKeyForRow(b);
        const aPinned = aKey ? !!a.markets?.[aKey] : false;
        const bPinned = bKey ? !!b.markets?.[bKey] : false;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
      }

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
        const aArb = getMaxArb(a) ?? -Infinity;
        const bArb = getMaxArb(b) ?? -Infinity;
        const cmp = aArb - bArb;
        return sortDir === "asc" ? cmp : -cmp;
      }

      // Sort by exchange column
      if (gmxDisplayColumnKey && sortKey === gmxDisplayColumnKey) {
        const aOptions = gmxOptionsByToken.get(a.token ?? "") ?? [];
        const bOptions = gmxOptionsByToken.get(b.token ?? "") ?? [];
        const aKey = getGmxSelectedKey(a.token, aOptions);
        const bKey = getGmxSelectedKey(b.token, bOptions);
        const aRate =
          aOptions.find((opt) => opt.columnKey === aKey)?.rate ?? -Infinity;
        const bRate =
          bOptions.find((opt) => opt.columnKey === bKey)?.rate ?? -Infinity;
        const cmp = aRate - bRate;
        return sortDir === "asc" ? cmp : -cmp;
      }

      const aRate = getRate(a.markets?.[sortKey], timeWindow) ?? -Infinity;
      const bRate = getRate(b.markets?.[sortKey], timeWindow) ?? -Infinity;
      const cmp = aRate - bRate;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [rows, search, sortKey, sortDir, timeWindow, minAPR, maxAPRFilter, favoriteSet, filteredColumnKeys, pinnedColumnKey, maxArbByRow, gmxDisplayColumnKey, gmxOptionsByToken, gmxSelectionByToken, gmxDefaultKeyByToken]);

  /* ---------- pagination ---------- */
  const totalPages = limit === -1 ? 1 : Math.ceil(filtered.length / limit);
  const paginatedRows =
    limit === -1 ? filtered : filtered.slice(page * limit, page * limit + limit);

  const sortOptions = useMemo(() => {
    const base = [
      { key: "max_arb", dir: "desc" as SortDir, label: "APR High" },
      { key: "max_arb", dir: "asc" as SortDir, label: "APR Low" },
      { key: "token", dir: "asc" as SortDir, label: "Asset A-Z" },
      { key: "token", dir: "desc" as SortDir, label: "Asset Z-A" },
    ];
    const columnOptions = displayColumns.flatMap((col) => {
      const label = formatColumnHeader(col, exchangesWithMultipleQuotes);
      return [
        {
          key: col.column_key,
          dir: "desc" as SortDir,
          label: `${label} High`,
          exchange: col.exchange,
        },
        {
          key: col.column_key,
          dir: "asc" as SortDir,
          label: `${label} Low`,
          exchange: col.exchange,
        },
      ];
    });
    return [...base, ...columnOptions];
  }, [displayColumns, exchangesWithMultipleQuotes]);

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
              <FundingScreenerMobileSort
                open={mobileSortOpen}
                onOpenChange={setMobileSortOpen}
                sortKey={sortKey}
                sortDir={sortDir}
                options={sortOptions}
                onSelect={setSort}
              />
              {/* Time window dropdown */}
              <div className="relative min-[960px]:block hidden">
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
                headerExtras={
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setPinnedDirty(true);
                        setPinnedColumnKey(null);
                      }}
                      disabled={!pinnedColumnKey}
                      className={[
                        "transition",
                        pinnedColumnKey
                          ? "text-gray-200 underline underline-offset-2"
                          : "text-gray-400/50",
                      ].join(" ")}
                    >
                      Reset pinned
                    </button>
                  </div>
                }
                renderExchangeActions={(exchange) => {
                  const columnKey = getPreferredColumnKey(exchange);
                  if (!columnKey) return null;
                  const isPinned = pinnedColumnKey === columnKey;
                  return (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setPinnedDirty(true);
                        setPinnedColumnKey((prev) => (prev === columnKey ? null : columnKey));
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
              />

              <div className="flex items-center gap-3 w-full min-[960px]:hidden">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white w-4 h-4" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search asset"
                    className={`${TAILWIND.input.default} pl-10 pr-9 bg-transparent border border-[#383d50] focus:bg-transparent focus:border-[#383d50] w-full`}
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
                <div className="relative shrink-0">
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
              </div>

              <div className="relative w-full order-last sm:order-none sm:w-auto hidden min-[960px]:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white w-4 h-4" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search asset"
                  className={`${TAILWIND.input.default} pl-10 pr-9 bg-transparent border border-[#383d50] focus:bg-transparent focus:border-[#383d50] w-full`}
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

          <FundingScreenerMobileCards
            rows={filtered}
            loading={loading}
            timeWindow={timeWindow}
            filteredColumns={displayColumns}
            gmxColumns={gmxColumns}
            gmxOptionsByToken={gmxOptionsByToken}
            gmxColumnKeySet={gmxColumnKeySet}
            getGmxSelectedKey={getGmxSelectedKey}
            onSelectGmxKey={setGmxSelectedKey}
            filteredColumnKeys={filteredColumnKeys}
            pinnedColumnKey={pinnedColumnKey}
            exchangesWithMultipleQuotes={exchangesWithMultipleQuotes}
            onOpenModal={openModal}
          />

          {/* ---------- table ---------- */}
          <div className="overflow-x-auto min-[960px]:block hidden">
            <table className="table-fixed w-max border-collapse text-xs whitespace-nowrap">
              <colgroup>
                <col className="w-[48px]" />
                <col className="w-[90px]" />
                <col className="w-[80px]" />
                {displayColumns.map((col) => (
                  <col
                    key={col.column_key}
                    className={col.isGmxGroup ? "w-[110px]" : "w-[75px]"}
                  />
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
                  {displayColumns.map((col) => {
                    const isPinned = pinnedColumnKey === col.column_key;
                    const isGmxGroup = !!col.isGmxGroup;
                    return (
                      <th
                        key={col.column_key}
                        className={`${TAILWIND.table.header} text-center whitespace-nowrap ${isPinned ? "bg-[#353b52]/60" : ""}`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <ExchangeIcon exchange={col.exchange} size={22} />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPinnedDirty(true);
                                setPinnedColumnKey((prev) => (prev === col.column_key ? null : col.column_key));
                              }}
                              className={`p-0.5 rounded ${isPinned ? "text-[#FA814D]" : "text-gray-500 hover:text-gray-300"}`}
                              aria-label={isPinned ? "Unpin exchange" : "Pin exchange"}
                              title={isPinned ? "Unpin" : "Pin"}
                            >
                              <Pin size={12} />
                            </button>
                          </div>
                          {isGmxGroup ? (
                            <div className="flex items-center justify-center gap-1">
                              <SortableHeader
                                label={formatColumnHeader(col, exchangesWithMultipleQuotes)}
                                active={sortKey === col.column_key}
                                dir={sortDir}
                                onClick={() => toggleSort(col.column_key)}
                              />
                              <GmxInfo />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyGmxSide(
                                    gmxPreferredSide === "long" ? "short" : "long"
                                  );
                                }}
                                className="relative inline-flex h-4 w-9 items-center rounded-full border border-[#343a4e] bg-[#23283a] p-0.5 text-[9px] font-medium text-gray-400"
                                title={
                                  gmxPreferredSide === "long"
                                    ? "Long rates"
                                    : "Short rates"
                                }
                                aria-label="Toggle GMX side"
                              >
                                <span className="relative z-10 grid w-full grid-cols-2">
                                  <span
                                    className={`text-center transition-colors ${
                                      gmxPreferredSide === "long"
                                        ? "text-emerald-200"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    L
                                  </span>
                                  <span
                                    className={`text-center transition-colors ${
                                      gmxPreferredSide === "short"
                                        ? "text-red-200"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    S
                                  </span>
                                </span>
                                <span
                                  className={`absolute left-0.5 top-1/2 h-3 w-[calc(50%-2px)] -translate-y-1/2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                    gmxPreferredSide === "long"
                                      ? "translate-x-0 bg-emerald-500/25"
                                      : "translate-x-full bg-red-500/25"
                                  }`}
                                />
                              </button>
                            </div>
                          ) : (
                            <SortableHeader
                              label={formatColumnHeader(col, exchangesWithMultipleQuotes)}
                              active={sortKey === col.column_key}
                              dir={sortDir}
                              onClick={() => toggleSort(col.column_key)}
                              centered
                            />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={3 + displayColumns.length}
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
                      colSpan={3 + displayColumns.length}
                      className="px-4 py-8 text-center text-gray-500 text-sm"
                    >
                      No tokens found
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const pinnedKey = getPinnedKeyForRow(row);
                    const columnKeys = getColumnKeysForRow(row);
                    const forcedSides = getForcedSidesForRow(row) ?? undefined;
                    const maxArb = calculateMaxArbPinnedWithForcedSides(
                      row.markets,
                      timeWindow,
                      columnKeys,
                      pinnedKey,
                      forcedSides
                    );
                    const arbPair = findArbPairPinnedWithForcedSides(
                      row.markets,
                      timeWindow,
                      columnKeys,
                      pinnedKey,
                      forcedSides
                    );

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
                          <APRCell
                            maxArb={maxArb}
                            arbPair={arbPair}
                            token={row.token}
                            onOpenModal={openModal}
                          />
                        </td>

                        {/* Exchange columns */}
                        {displayColumns.map((col) => {
                          if (col.isGmxGroup) {
                            const options = gmxOptionsByToken.get(row.token ?? "") ?? [];
                            const selectedKey = getGmxSelectedKey(row.token, options);
                            const selectedOption =
                              options.find((opt) => opt.columnKey === selectedKey) ??
                              options[0];
                            const role = arbPair && selectedOption
                              ? selectedOption.columnKey === arbPair.longKey
                                ? "long"
                                : selectedOption.columnKey === arbPair.shortKey
                                ? "short"
                                : undefined
                              : undefined;

                            return (
                              <td
                                key={col.column_key}
                                className="px-2 py-2 text-right font-mono tabular-nums"
                              >
                                {selectedOption ? (
                                  <GmxRateCell
                                    options={options}
                                    selectedKey={selectedOption.columnKey}
                                    onSelectKey={(key) => setGmxSelectedKey(row.token, key)}
                                    token={row.token}
                                    role={role}
                                    preferredSide={gmxSideLocked ? gmxPreferredSide : undefined}
                                  />
                                ) : (
                                  <span className="text-gray-600 block text-center">–</span>
                                )}
                              </td>
                            );
                          }

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
            <div className="px-4 py-3 border-t border-[#343a4e] hidden min-[960px]:block">
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

      {modalData && (
        <ArbitrageChart
          open={modalOpen}
          onClose={closeModal}
          baseAsset={modalData.token}
          longMarketId={modalData.arbPair.longMarket.market_id}
          shortMarketId={modalData.arbPair.shortMarket.market_id}
          longExchange={modalData.arbPair.longMarket.exchange}
          shortExchange={modalData.arbPair.shortMarket.exchange}
          longLabel={modalLongLabel}
          shortLabel={modalShortLabel}
          longUrl={modalData.arbPair.longMarket.ref_url}
          shortUrl={modalData.arbPair.shortMarket.ref_url}
          backtesterUrl={modalBacktesterUrl}
        />
      )}
    </ErrorBoundary>
  );
}
