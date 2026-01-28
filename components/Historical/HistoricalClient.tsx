"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ExternalLink } from "lucide-react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { Line } from "react-chartjs-2";
import ExchangeIcon from "@/components/ui/ExchangeIcon";
import { formatExchange, normalizeToken } from "@/lib/formatters";
import { COLORS, CHART_CONFIG, TAILWIND } from "@/lib/theme";
import type { FundingChartPoint } from "@/lib/types";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler
);

type FundingDashboardRow = {
  market_id: number | null;
  exchange: string;
  market: string;
  ref_url: string | null;
  open_interest: number | null;
  volume_24h: number | null;
  funding_rate_now: number | null;
  "1d": number | null;
  "3d": number | null;
  "7d": number | null;
  "15d": number | null;
  "30d": number | null;
  base_asset: string;
  quote_asset: string;
};

type ExchangeMarket = {
  exchange: string;
  label: string;
  row: FundingDashboardRow;
  hasMultipleQuotes: boolean;
};

type TokenFundingChartRow = {
  exchange: string;
  market_id: number | string;
  h: string;
  funding_apr_8h: number;
  funding_count: number;
};

const TIME_WINDOWS = [
  { key: "1d", label: "1d", days: 1 },
  { key: "3d", label: "3d", days: 3 },
  { key: "7d", label: "7d", days: 7 },
  { key: "15d", label: "15d", days: 15 },
  { key: "30d", label: "30d", days: 30 },
] as const;

const CHART_COLORS = [
  "#60a5fa",
  "#34d399",
  "#f87171",
  "#fbbf24",
  "#a78bfa",
  "#22d3ee",
  "#f472b6",
  "#fb7185",
  "#38bdf8",
  "#4ade80",
  "#f97316",
  "#c084fc",
  "#e879f9",
  "#818cf8",
  "#fb7185",
  "#facc15",
  "#5eead4",
  "#cbd5f5",
  "#fca5a5",
  "#93c5fd",
  "#a3e635",
  "#fda4af",
  "#f59e0b",
  "#0ea5e9",
];

async function fetchTokenFundingChartsAll(params: {
  assetNorm: string;
  days?: number;
  signal?: AbortSignal;
}): Promise<TokenFundingChartRow[]> {
  const { assetNorm, days = 30, signal } = params;
  const timeoutMs = 12000;
  const controller = new AbortController();
  let timedOut = false;

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(
      `/api/chart/funding-all?asset=${encodeURIComponent(assetNorm)}&days=${days}`,
      {
        signal: controller.signal,
      }
    );
    if (!res.ok) throw new Error("Unable to load history.");
    const json = (await res.json()) as { rows?: TokenFundingChartRow[] };
    return json.rows ?? [];
  } catch (err) {
    if (timedOut) {
      throw new Error("Unable to load history. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function HistoricalClient({ initialRows }: { initialRows: FundingDashboardRow[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [assetSearch, setAssetSearch] = useState("");
  const [openAsset, setOpenAsset] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [selectedWindow, setSelectedWindow] = useState<(typeof TIME_WINDOWS)[number]>(TIME_WINDOWS[4]);
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [chartRows, setChartRows] = useState<TokenFundingChartRow[]>([]);

  const assets = useMemo(() => {
    const set = new Set<string>();
    initialRows.forEach((row) => {
      if (row.base_asset) set.add(row.base_asset);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [initialRows]);

  useEffect(() => {
    if (!selectedAsset && assets.length) {
      setSelectedAsset(assets.includes("BTC") ? "BTC" : assets[0]);
    }
  }, [assets, selectedAsset]);

  const filteredAssets = useMemo(() => {
    if (!assetSearch) return assets;
    const q = normalizeToken(assetSearch);
    return assets.filter((asset) => normalizeToken(asset).startsWith(q));
  }, [assets, assetSearch]);

  const assetRows = useMemo(() => {
    if (!selectedAsset) return [];
    const normalized = normalizeToken(selectedAsset);
    return initialRows.filter((row) => normalizeToken(row.base_asset) === normalized);
  }, [initialRows, selectedAsset]);

  const exchangeMarkets = useMemo<ExchangeMarket[]>(() => {
    const map = new Map<string, FundingDashboardRow[]>();
    assetRows.forEach((row) => {
      if (!map.has(row.exchange)) map.set(row.exchange, []);
      map.get(row.exchange)?.push(row);
    });

    const list: ExchangeMarket[] = [];
    map.forEach((rows, exchange) => {
      const uniqueQuotes = new Set(rows.map((r) => r.quote_asset));
      const hasMultipleQuotes = uniqueQuotes.size > 1;

      const best = [...rows].sort((a, b) => {
        const aOi = a.open_interest ?? -1;
        const bOi = b.open_interest ?? -1;
        if (aOi !== bOi) return bOi - aOi;
        const aVol = a.volume_24h ?? -1;
        const bVol = b.volume_24h ?? -1;
        if (aVol !== bVol) return bVol - aVol;
        const aUsdt = a.quote_asset?.toUpperCase() === "USDT" ? 1 : 0;
        const bUsdt = b.quote_asset?.toUpperCase() === "USDT" ? 1 : 0;
        return bUsdt - aUsdt;
      })[0];

      const label = `${formatExchange(exchange)}${hasMultipleQuotes ? ` (${best.quote_asset})` : ""}`;
      list.push({ exchange, label, row: best, hasMultipleQuotes });
    });

    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [assetRows]);

  useEffect(() => {
    if (!exchangeMarkets.length) {
      setSelectedExchanges([]);
      return;
    }
    setSelectedExchanges(exchangeMarkets.map((m) => m.exchange));
  }, [selectedAsset, exchangeMarkets]);

  useEffect(() => {
    if (!selectedAsset) return;
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError("");

    const assetNorm = normalizeToken(selectedAsset).toUpperCase();
    fetchTokenFundingChartsAll({
      assetNorm,
      days: selectedWindow.days,
      signal: controller.signal,
    })
      .then((rows) => {
        if (cancelled) return;
        setChartRows(rows ?? []);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message ?? "Unable to load chart data.");
        setChartRows([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedAsset, selectedWindow]);

  const seriesByExchange = useMemo(() => {
    if (!exchangeMarkets.length || selectedExchanges.length === 0) return {};
    const allowedMarketIds = new Set<number>();
    const exchangeByMarketId = new Map<number, string>();
    exchangeMarkets.forEach((market) => {
      if (market.row.market_id != null) {
        const marketId = Number(market.row.market_id);
        allowedMarketIds.add(marketId);
        exchangeByMarketId.set(marketId, market.exchange);
      }
    });

    const filtered = chartRows.filter((row) =>
      allowedMarketIds.has(Number(row.market_id))
    );

    const next: Record<string, FundingChartPoint[]> = {};
    filtered.forEach((row) => {
      const exchange = exchangeByMarketId.get(Number(row.market_id)) ?? row.exchange;
      if (!exchange || !selectedExchanges.includes(exchange)) return;
      if (!next[exchange]) next[exchange] = [];
      next[exchange].push({ funding_time: row.h, apr: row.funding_apr_8h });
    });

    return next;
  }, [chartRows, exchangeMarkets, selectedExchanges]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenAsset(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const datasets = useMemo(() => {
    const activeMarkets = exchangeMarkets.filter((m) => selectedExchanges.includes(m.exchange));
    return activeMarkets.map((market, index) => {
      const rows = seriesByExchange[market.exchange] ?? [];
      const data = rows
        .filter((r) => Number.isFinite(r.apr))
        .map((r) => ({
          x: new Date(r.funding_time).getTime(),
          y: r.apr,
        }));
      const color = CHART_COLORS[index % CHART_COLORS.length];
      return {
        label: market.label,
        data,
        borderColor: color,
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 8,
        tension: 0.25,
        parsing: false as const,
      };
    });
  }, [exchangeMarkets, selectedExchanges, seriesByExchange]);

  const chartData = useMemo(
    () => ({
      datasets,
    }),
    [datasets]
  );

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(20, 24, 36, 0.92)",
          borderColor: "rgba(148, 163, 184, 0.2)",
          borderWidth: 1,
          padding: 10,
          titleColor: "#e2e8f0",
          bodyColor: "#e2e8f0",
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y;
              return Number.isFinite(v) ? `APR: ${Number(v).toFixed(2)}%` : "";
            },
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: CHART_CONFIG.TOOLTIP_FORMAT,
          },
          grid: {
            color: COLORS.chart.grid,
          },
          ticks: {
            color: "#9ca3af",
            font: {
              size: 11,
            },
          },
        },
        y: {
          grid: {
            color: (ctx) =>
              ctx.tick?.value === 0 ? COLORS.chart.gridZero : COLORS.chart.grid,
            lineWidth: (ctx) => (ctx.tick?.value === 0 ? 1.2 : 1),
          },
          ticks: {
            color: "#9ca3af",
            callback: (value) => (typeof value === "number" ? `${value}%` : ""),
          },
        },
      },
      transitions: {
        zoom: {
          animation: {
            duration: 0,
          },
        },
      },
    }),
    []
  );

  const toggleExchange = (exchange: string) => {
    setSelectedExchanges((prev) =>
      prev.includes(exchange)
        ? prev.filter((ex) => ex !== exchange)
        : [...prev, exchange]
    );
  };

  const selectAllExchanges = () =>
    setSelectedExchanges(exchangeMarkets.map((market) => market.exchange));
  const clearAllExchanges = () => setSelectedExchanges([]);

  return (
    <section className="px-4 pb-16" ref={containerRef}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[150px]">
          <button
            type="button"
            onClick={() => setOpenAsset((prev) => !prev)}
            className={`${TAILWIND.button.secondary} w-full text-left text-sm inline-flex items-center justify-between gap-2`}
          >
            <span className="truncate">{selectedAsset || "BTC"}</span>
            <Search className="h-4 w-4 text-gray-300 shrink-0" />
          </button>
          {openAsset && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenAsset(false)} />
              <div className="absolute z-50 mt-2 w-full bg-[#292e40] border border-[#343a4e] rounded-lg shadow-lg animate-tooltip-zoom">
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={assetSearch}
                  onChange={(event) => setAssetSearch(event.target.value)}
                  className="w-full px-3 py-2 bg-[#1c202f] border-b border-[#343a4e] rounded-t-lg text-sm text-gray-200 focus:outline-none"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto">
                  {filteredAssets.map((asset) => (
                    <button
                      key={asset}
                      type="button"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setAssetSearch("");
                        setOpenAsset(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[#353b52] transition"
                    >
                      {asset}
                    </button>
                  ))}
                  {!filteredAssets.length && (
                    <div className="px-3 py-2 text-sm text-gray-500">No assets found</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative inline-grid grid-cols-5 gap-0 rounded-lg border border-[#343a4e] bg-[#292e40] p-1">
          <div
            className="absolute top-1 bottom-1 rounded-md bg-[#3b435a] transition-transform duration-300 ease-out"
            style={{
              left: 4,
              width: "calc((100% - 8px) / 5)",
              transform: `translateX(calc(${TIME_WINDOWS.findIndex((w) => w.key === selectedWindow.key)} * 100%))`,
            }}
          />
          {TIME_WINDOWS.map((window) => (
            <button
              key={window.key}
              type="button"
              onClick={() => setSelectedWindow(window)}
              className={`relative z-10 px-3 py-1.5 text-xs rounded-md transition-colors ${
                selectedWindow.key === window.key
                  ? "text-gray-100"
                  : "text-gray-400 hover:text-gray-200 hover:bg-[#353b52]"
              }`}
            >
              {window.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#2a3044] bg-[#1f2434] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-roboto text-gray-100">Funding Rate Chart</h2>
            <p className="text-xs text-gray-400">
              {selectedAsset ? `${selectedAsset} · ${selectedWindow.label} window` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllExchanges}
              className={`${TAILWIND.button.secondary} text-xs`}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAllExchanges}
              className={`${TAILWIND.button.secondary} text-xs`}
            >
              Clear all
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
          <div className="relative min-h-[540px] lg:min-h-[620px] rounded-xl bg-[#1b2030] p-2">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1b2030]/70 backdrop-blur-sm z-10">
                <div className="h-6 w-6 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
              </div>
            )}
            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                {error}
              </div>
            )}
            <Line data={chartData} options={options} />
          </div>

          <div className="rounded-xl bg-[#242a3d] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#2f354a]">
              <span className="text-xs uppercase tracking-[0.2em] text-gray-500">Legend</span>
              <span className="text-[11px] text-gray-500">
                {selectedExchanges.length}/{exchangeMarkets.length}
              </span>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
              {exchangeMarkets.map((market, idx) => {
                const exchange = market.exchange;
                const label = market.label ?? formatExchange(exchange);
                const color = CHART_COLORS[idx % CHART_COLORS.length];
                const active = selectedExchanges.includes(exchange);
                return (
                  <button
                    key={exchange}
                    type="button"
                    onClick={() => toggleExchange(exchange)}
                    className={`w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left transition ${
                      active ? "bg-[#2f364a]" : "hover:bg-[#2b3144]"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color, opacity: active ? 1 : 0.35 }}
                    />
                    <ExchangeIcon exchange={exchange} size={16} />
                    <span className="text-sm text-gray-200 truncate">{label}</span>
                  </button>
                );
              })}
              {!exchangeMarkets.length && (
                <div className="px-2 py-2 text-sm text-gray-500">No exchanges</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {exchangeMarkets
          .filter((market) => market.row.ref_url)
          .map((market) => (
            <a
              key={market.exchange}
              href={market.row.ref_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#343a4e] bg-[#292e40] px-3 py-2 text-xs text-gray-200 hover:border-white transition"
            >
              <ExchangeIcon exchange={market.exchange} size={14} />
              {market.label}
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
            </a>
          ))}
      </div>
    </section>
  );
}
