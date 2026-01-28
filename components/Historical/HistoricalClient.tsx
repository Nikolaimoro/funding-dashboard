"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, ExternalLink } from "lucide-react";
import type { ChartOptions } from "chart.js";
import "chartjs-adapter-date-fns";
import dynamic from "next/dynamic";
import ExchangeIcon from "@/components/ui/ExchangeIcon";
import { formatExchange, normalizeToken } from "@/lib/formatters";
import { COLORS, CHART_CONFIG, TAILWIND } from "@/lib/theme";
import type { FundingChartPoint } from "@/lib/types";

const HistoryChart = dynamic(
  () => import("@/components/Historical/HistoryChart"),
  { ssr: false }
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

type MarketItem = {
  key: string;
  marketId: number;
  exchange: string;
  quote: string;
  label: string;
  isGmx: boolean;
  side: "long" | "short" | null;
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

const normalizeFundingTimestamp = (value: string) => {
  const ts = value.includes("T") ? value : value.replace(" ", "T");
  return ts.replace(/\+00(?::?00)?$/, "Z");
};

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
  const [selectedMarketKeys, setSelectedMarketKeys] = useState<string[]>([]);
  const [gmxSideByQuote, setGmxSideByQuote] = useState<Record<string, "long" | "short">>({});

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
    const q = assetSearch.trim().toUpperCase();
    return assets.filter((asset) => asset.startsWith(q));
  }, [assets, assetSearch]);

  const assetRows = useMemo(() => {
    if (!selectedAsset) return [];
    return initialRows.filter((row) => row.base_asset === selectedAsset);
  }, [initialRows, selectedAsset]);

  useEffect(() => {
    setGmxSideByQuote({});
  }, [selectedAsset]);

  useEffect(() => {
    if (!assetRows.length || !chartRows.length) return;

    const dataByMarketId = new Set<number>();
    chartRows.forEach((row) => {
      if (row.funding_apr_8h == null) return;
      const val = Number(row.funding_apr_8h);
      if (!Number.isFinite(val)) return;
      dataByMarketId.add(Number(row.market_id));
    });

    const gmxRows = assetRows.filter((row) => row.exchange === "gmx");
    if (!gmxRows.length) return;

    const byQuote = new Map<string, FundingDashboardRow[]>();
    gmxRows.forEach((row) => {
      if (!byQuote.has(row.quote_asset)) {
        byQuote.set(row.quote_asset, []);
      }
      byQuote.get(row.quote_asset)?.push(row);
    });

    let changed = false;
    const next: Record<string, "long" | "short"> = { ...gmxSideByQuote };

    byQuote.forEach((rows, quote) => {
      const longRow = rows.find((row) => row.market.endsWith(" LONG"));
      const shortRow = rows.find((row) => row.market.endsWith(" SHORT"));
      const longId = longRow?.market_id ? Number(longRow.market_id) : null;
      const shortId = shortRow?.market_id ? Number(shortRow.market_id) : null;
      const current = next[quote] ?? "short";
      const currentId = current === "long" ? longId : shortId;
      const otherId = current === "long" ? shortId : longId;

      const currentHasData = currentId != null && dataByMarketId.has(currentId);
      const otherHasData = otherId != null && dataByMarketId.has(otherId);

      if (!currentHasData && otherHasData) {
        next[quote] = current === "long" ? "short" : "long";
        changed = true;
      }
    });

    if (changed) {
      setGmxSideByQuote(next);
    }
  }, [assetRows, chartRows, gmxSideByQuote]);

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

  const marketItems = useMemo<MarketItem[]>(() => {
    const quotesByExchange = new Map<string, Set<string>>();
    assetRows.forEach((row) => {
      if (!quotesByExchange.has(row.exchange)) {
        quotesByExchange.set(row.exchange, new Set());
      }
      quotesByExchange.get(row.exchange)?.add(row.quote_asset);
    });

    const gmxRows = assetRows.filter((row) => row.exchange === "gmx");
    const nonGmxRows = assetRows.filter((row) => row.exchange !== "gmx");

    const items: MarketItem[] = [];

    nonGmxRows.forEach((row) => {
      if (row.market_id == null) return;
      const quotes = quotesByExchange.get(row.exchange);
      const hasMultiple = quotes ? quotes.size > 1 : false;
      const label = `${formatExchange(row.exchange)}${hasMultiple ? ` (${row.quote_asset})` : ""}`;
      items.push({
        key: `${row.exchange}|${row.market_id}`,
        marketId: Number(row.market_id),
        exchange: row.exchange,
        quote: row.quote_asset,
        label,
        isGmx: false,
        side: null,
      });
    });

    if (gmxRows.length) {
      const byQuote = new Map<string, FundingDashboardRow[]>();
      gmxRows.forEach((row) => {
        if (!byQuote.has(row.quote_asset)) {
          byQuote.set(row.quote_asset, []);
        }
        byQuote.get(row.quote_asset)?.push(row);
      });

      byQuote.forEach((rows, quote) => {
        const side = gmxSideByQuote[quote] ?? "short";
        const match = rows.find((row) => row.market.endsWith(` ${side.toUpperCase()}`));
        const fallback = match ?? rows[0];
        if (!fallback?.market_id) return;
        const label = `${formatExchange("gmx")} (${quote})`;
        items.push({
          key: `gmx|${quote}`,
          marketId: Number(fallback.market_id),
          exchange: "gmx",
          quote,
          label,
          isGmx: true,
          side,
        });
      });
    }

    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [assetRows, gmxSideByQuote]);

  const lastAssetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!marketItems.length) {
      setSelectedMarketKeys([]);
      lastAssetRef.current = selectedAsset || null;
      return;
    }
    if (lastAssetRef.current !== selectedAsset) {
      setSelectedMarketKeys(marketItems.map((m) => m.key));
      lastAssetRef.current = selectedAsset;
      return;
    }
    const validKeys = new Set(marketItems.map((m) => m.key));
    const filtered = selectedMarketKeys.filter((key) => validKeys.has(key));
    if (filtered.length !== selectedMarketKeys.length) {
      setSelectedMarketKeys(filtered);
    }
  }, [selectedAsset, marketItems, selectedMarketKeys]);

  useEffect(() => {
    if (!selectedAsset) return;
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError("");

    const assetNorm = selectedAsset;
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

  const marketIdByKey = useMemo(() => {
    const map = new Map<string, number>();
    marketItems.forEach((m) => map.set(m.key, m.marketId));
    return map;
  }, [marketItems]);

  const selectedMarketIds = useMemo(
    () => selectedMarketKeys.map((key) => marketIdByKey.get(key)).filter(Boolean) as number[],
    [selectedMarketKeys, marketIdByKey]
  );

  const exchangeCounts = useMemo(() => {
    const map = new Map<string, number>();
    marketItems.forEach((m) => {
      map.set(m.exchange, (map.get(m.exchange) ?? 0) + 1);
    });
    return map;
  }, [marketItems]);

  const pointsByMarketId = useMemo(() => {
    if (!selectedMarketIds.length) return new Map<number, { x: number; y: number }[]>();
    const allowedMarketIds = new Set<number>(marketItems.map((m) => m.marketId));
    const selectedIdsSet = new Set<number>(selectedMarketIds);
    const map = new Map<number, { x: number; y: number }[]>();

    chartRows.forEach((row) => {
      const marketId = Number(row.market_id);
      if (!allowedMarketIds.has(marketId)) return;
      if (!selectedIdsSet.has(marketId)) return;
      if (row.funding_apr_8h == null) return;
      const apr = Number(row.funding_apr_8h);
      if (!Number.isFinite(apr)) return;
      const x = new Date(normalizeFundingTimestamp(row.h)).getTime();
      if (!Number.isFinite(x)) return;
      if (!map.has(marketId)) map.set(marketId, []);
      map.get(marketId)!.push({ x, y: apr });
    });

    map.forEach((rows) => rows.sort((a, b) => a.x - b.x));
    return map;
  }, [chartRows, marketItems, selectedMarketIds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenAsset(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const colorByKey = useMemo(() => {
    const map = new Map<string, string>();
    marketItems.forEach((market, index) => {
      map.set(market.key, CHART_COLORS[index % CHART_COLORS.length]);
    });
    return map;
  }, [marketItems]);

  const datasets = useMemo(() => {
    const activeMarkets = marketItems.filter((m) => selectedMarketKeys.includes(m.key));
    return activeMarkets.map((market) => {
      const data = pointsByMarketId.get(market.marketId) ?? [];
      const color = colorByKey.get(market.key) ?? COLORS.chart.primary;
      const validCount = data.length;
      return {
        label: market.label,
        data,
        borderColor: color,
        borderWidth: 2,
        pointRadius: validCount < 2 ? 3 : 0,
        pointHitRadius: 8,
        tension: 0.25,
        showLine: true,
        parsing: false as const,
      };
    });
  }, [marketItems, selectedMarketKeys, pointsByMarketId, colorByKey]);

  const chartData = useMemo(
    () => ({
      datasets,
    }),
    [datasets]
  );

  const { minX, maxX } = useMemo(() => {
    const xs = datasets
      .flatMap((dataset) => (dataset.data as { x: number }[]).map((point) => point.x))
      .filter((x) => Number.isFinite(x)) as number[];

    if (!xs.length) {
      return {
        minX: Date.now() - CHART_CONFIG.THIRTY_DAYS_MS,
        maxX: Date.now(),
      };
    }

    return { minX: Math.min(...xs), maxX: Math.max(...xs) };
  }, [datasets]);

  const fullRange = Math.max(1, maxX - minX);
  const minRange = Math.min(CHART_CONFIG.SEVEN_DAYS_MS, fullRange);

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: "x",
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "x",
            animation: false,
          },
          limits: {
            x: {
              min: minX,
              max: maxX,
              maxRange: fullRange,
              minRange: minRange,
            },
          },
        },
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: (context) => {
            const { chart, tooltip } = context;
            let tooltipEl = chart.canvas.parentNode?.querySelector(
              ".historical-tooltip"
            ) as HTMLDivElement | null;

            if (!tooltipEl) {
              tooltipEl = document.createElement("div");
              tooltipEl.className =
                "historical-tooltip pointer-events-none absolute z-20 rounded-lg border border-[#343a4e] bg-[#171b28] px-3 py-2 text-xs text-gray-200 shadow-xl";
              chart.canvas.parentNode?.appendChild(tooltipEl);
            }

            if (tooltip.opacity === 0) {
              tooltipEl.style.opacity = "0";
              return;
            }

            const title = tooltip.title?.[0] ?? "";
            const rows = tooltip.dataPoints.map((point) => {
              const label = point.dataset.label ?? "";
              const value = Number(point.parsed.y);
              const color =
                typeof point.dataset.borderColor === "string"
                  ? point.dataset.borderColor
                  : "#60a5fa";
              return { label, value, color };
            });

            tooltipEl.innerHTML = `
              <div class="mb-1 text-[11px] text-gray-400">${title}</div>
              <div class="space-y-1">
                ${rows
                  .map(
                    (row) => `
                    <div class="flex items-center justify-between gap-4">
                      <div class="flex items-center gap-2 min-w-0">
                        <span style="background:${row.color}" class="h-2 w-2 rounded-full flex-shrink-0"></span>
                        <span class="truncate">${row.label}</span>
                      </div>
                      <span class="text-gray-100">${Number(row.value).toFixed(2)}%</span>
                    </div>
                  `
                  )
                  .join("")}
              </div>
            `;

            const { offsetLeft, offsetTop } = chart.canvas;
            const { chartArea } = chart;
            const midX = chartArea.left + chartArea.width / 2;
            const isRight = tooltip.caretX > midX;
            const anchorX = offsetLeft + tooltip.caretX;
            const anchorY = offsetTop + chartArea.top + chartArea.height * 0.5;
            tooltipEl.style.opacity = "1";
            tooltipEl.style.left = `${anchorX}px`;
            tooltipEl.style.top = `${anchorY}px`;
            tooltipEl.style.transform = isRight
              ? "translate(-110%, -50%)"
              : "translate(10%, -50%)";
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: CHART_CONFIG.TOOLTIP_FORMAT,
            unit: "day",
            displayFormats: {
              day: "MMM d",
            },
          },
          grid: {
            color: COLORS.chart.grid,
          },
          ticks: {
            color: "#9ca3af",
            font: {
              size: 11,
            },
            source: "auto",
            maxTicksLimit: 8,
            callback: (value) => {
              const ts = Number(value);
              if (!Number.isFinite(ts)) return "";
              return new Date(ts).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
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
    [minX, maxX, fullRange, minRange]
  );

  const toggleMarket = (key: string) => {
    setSelectedMarketKeys((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]
    );
  };

  const selectAllMarkets = () =>
    setSelectedMarketKeys(marketItems.map((market) => market.key));
  const clearAllMarkets = () => setSelectedMarketKeys([]);

  const setGmxSide = (quote: string, side: "long" | "short") => {
    setGmxSideByQuote((prev) => ({ ...prev, [quote]: side }));
  };

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

        <div className="relative inline-grid grid-cols-5 gap-0 min-w-[260px] rounded-lg border border-[#343a4e] bg-[#292e40] p-1">
          <div
            className="absolute top-1 bottom-1 rounded-md bg-[#3b435a] transition-transform duration-300 ease-out"
            style={{
              left: 4,
              width: "calc((100% - 8px) / 5)",
              transform: `translateX(${TIME_WINDOWS.findIndex(
                (w) => w.key === selectedWindow.key
              ) * 100}%)`,
            }}
          />
          {TIME_WINDOWS.map((window) => (
            <button
              key={window.key}
              type="button"
              onClick={() => setSelectedWindow(window)}
              className={`relative z-10 px-3 py-1.5 text-xs rounded-md text-center transition-colors ${
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

      <div className="mt-6 rounded-2xl bg-[#1f2434] p-4">
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
              onClick={selectAllMarkets}
              className={`${TAILWIND.button.secondary} text-xs`}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAllMarkets}
              className={`${TAILWIND.button.secondary} text-xs`}
            >
              Clear all
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 h-[480px] lg:h-[580px] items-stretch">
          <div className="relative h-full rounded-xl bg-[#1b2030] p-2">
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
            <HistoryChart data={chartData} options={options} />
          </div>

          <div className="rounded-xl bg-[#22273a] overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#2b3147]">
              <span className="text-xs uppercase tracking-[0.2em] text-gray-500">Legend</span>
              <span className="text-[11px] text-gray-500">
                {selectedMarketKeys.length}/{marketItems.length}
              </span>
            </div>
            <div className="h-full overflow-y-auto p-2 space-y-1">
              {marketItems.map((market, idx) => {
                const exchange = market.exchange;
                const label = market.label ?? formatExchange(exchange);
                const color = colorByKey.get(market.key) ?? COLORS.chart.primary;
                const active = selectedMarketKeys.includes(market.key);
                return (
                  <button
                    key={market.key}
                    type="button"
                    onClick={() => toggleMarket(market.key)}
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
                    {market.isGmx && (
                      <button
                        type="button"
                        aria-pressed={market.side === "long"}
                        onClick={(event) => {
                          event.stopPropagation();
                          setGmxSide(market.quote, market.side === "long" ? "short" : "long");
                        }}
                        className="ml-auto relative inline-flex h-5 w-12 items-center rounded-full border border-[#343a4e] bg-[#23283a] p-0.5 text-[10px] font-medium text-gray-400 transition-colors"
                        title={market.side === "long" ? "Long rates" : "Short rates"}
                      >
                        <span className="relative z-10 grid w-full grid-cols-2">
                          <span
                            className={`text-center text-[10px] transition-colors ${
                              market.side === "long" ? "text-emerald-200" : "text-gray-400"
                            }`}
                          >
                            L
                          </span>
                          <span
                            className={`text-center text-[10px] transition-colors ${
                              market.side === "short" ? "text-red-200" : "text-gray-400"
                            }`}
                          >
                            S
                          </span>
                        </span>
                        <span
                          className={`absolute left-0.5 top-1/2 h-4 w-[calc(50%-2px)] -translate-y-1/2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            market.side === "long"
                              ? "translate-x-0 bg-emerald-500/25"
                              : "translate-x-full bg-red-500/25"
                          }`}
                        />
                      </button>
                    )}
                  </button>
                );
              })}
              {!marketItems.length && (
                <div className="px-2 py-2 text-sm text-gray-500">No exchanges</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(() => {
          const quotesByExchange = new Map<string, Set<string>>();
          assetRows.forEach((row) => {
            if (!quotesByExchange.has(row.exchange)) {
              quotesByExchange.set(row.exchange, new Set());
            }
            quotesByExchange.get(row.exchange)?.add(row.quote_asset);
          });

          const gmxRows = assetRows.filter((row) => row.exchange === "gmx");
          const nonGmxRows = assetRows.filter((row) => row.exchange !== "gmx");

          const links: ReactNode[] = [];

          nonGmxRows
            .filter((row) => row.ref_url)
            .forEach((row) => {
              const quotes = quotesByExchange.get(row.exchange);
              const hasMultiple = quotes ? quotes.size > 1 : false;
              const label = `${formatExchange(row.exchange)}${
                hasMultiple ? ` (${row.quote_asset})` : ""
              }`;
              links.push(
                <a
                  key={`${row.exchange}-${row.market_id}`}
                  href={row.ref_url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#343a4e] bg-[#292e40] px-3 py-2 text-xs text-gray-200 hover:border-white transition"
                >
                  <ExchangeIcon exchange={row.exchange} size={14} />
                  {label}
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                </a>
              );
            });

          if (gmxRows.length) {
            const best = [...gmxRows]
              .filter((row) => row.ref_url)
              .sort((a, b) => (b.open_interest ?? -1) - (a.open_interest ?? -1))[0];
            if (best?.ref_url) {
              links.push(
                <a
                  key="gmx-single"
                  href={best.ref_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#343a4e] bg-[#292e40] px-3 py-2 text-xs text-gray-200 hover:border-white transition"
                >
                  <ExchangeIcon exchange="gmx" size={14} />
                  {formatExchange("gmx")}
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                </a>
              );
            }
          }

          return links;
        })()}
      </div>
    </section>
  );
}
