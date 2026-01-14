"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ExternalLink } from "lucide-react";
import { formatExchange } from "@/lib/formatters";
import { COLORS, CHART_CONFIG } from "@/lib/theme";
import { RPC_FUNCTIONS } from "@/lib/constants";
import { ArbChartRow } from "@/lib/types";
import type { BacktesterChartData } from "@/lib/types/backtester";
import {
  Chart as ChartJS,
  LineController,
  BarController,
  LineElement,
  PointElement,
  BarElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { Chart } from "react-chartjs-2";
import zoomPlugin from "chartjs-plugin-zoom";

ChartJS.register(
  LineController,
  BarController,
  LineElement,
  PointElement,
  BarElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

/**
 * Chart caching strategy:
 * - When false: No caching, fetch fresh data every time (best for production)
 * - When true: Cache chart results by market ID pair, include "Force Refresh" button
 * 
 * Set to false for now since there are no users and queries are fast.
 * Enable when needed for scaling.
 */
const USE_CHART_CACHE = false;

interface BacktesterChartProps {
  chartData: BacktesterChartData | null;
  selectedLongEx?: string;
  selectedShortEx?: string;
}

// In-memory cache: Map<"longMarketId-shortMarketId", { data: ArbChartRow[], timestamp: number }>
const chartCache = new Map<string, { data: ArbChartRow[]; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchBacktestData(params: {
  longMarketId: number;
  shortMarketId: number;
  days?: number;
  forceRefresh?: boolean;
}): Promise<ArbChartRow[]> {
  const { longMarketId, shortMarketId, days = 30, forceRefresh = false } = params;

  // Check cache first if enabled
  if (USE_CHART_CACHE && !forceRefresh) {
    const cacheKey = `${longMarketId}-${shortMarketId}`;
    const cached = chartCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[Chart Cache] Hit for ${cacheKey}`);
      return cached.data;
    }
  }

  // Add 10 second timeout to prevent infinite loading
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timeout. Please try again.")), 10000)
  );

  const fetchPromise = supabase.rpc(RPC_FUNCTIONS.ARB_CHART, {
    p_long_market_id: longMarketId,
    p_short_market_id: shortMarketId,
    p_days: days,
  });

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise as any]);

  if (error) throw error;

  const result = (data ?? []) as ArbChartRow[];

  // Store in cache if enabled
  if (USE_CHART_CACHE) {
    const cacheKey = `${longMarketId}-${shortMarketId}`;
    chartCache.set(cacheKey, { data: result, timestamp: Date.now() });
    console.log(`[Chart Cache] Stored for ${cacheKey}`);
  }

  return result;
}

export default function BacktesterChart({ chartData, selectedLongEx, selectedShortEx }: BacktesterChartProps) {
  const [rows, setRows] = useState<ArbChartRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [chartKey, setChartKey] = useState(0);

  const isLoaded = !!chartData?.longMarketId && !!chartData?.shortMarketId;

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;
    setLoading(true);
    setErr("");
    setRows([]); // Clear rows immediately
    setChartKey((prev) => prev + 1); // Force chart re-render

    fetchBacktestData({
      longMarketId: chartData.longMarketId,
      shortMarketId: chartData.shortMarketId,
      days: 30,
      forceRefresh,
    })
      .then((d) => {
        if (cancelled) return;
        setRows(d);
        setForceRefresh(false); // Reset force refresh flag after fetch
      })
      .catch((e: any) => {
        if (cancelled) return;
        setErr(e?.message ?? "Failed to load chart. Please try again.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, chartData?.longMarketId, chartData?.shortMarketId, forceRefresh]);

  const chartDataObj = useMemo(() => {
    const points = rows
      .filter((r) => r.h)
      .map((r) => ({
        x: new Date(r.h).getTime(),
        long: r.long_apr,
        short: r.short_apr,
        spread: r.spread_apr,
      }));

    return {
      datasets: [
        // spread bars (secondary axis right)
        {
          type: "bar" as const,
          label: "Spread (APR %)",
          data: points
            .filter((p) => Number.isFinite(p.spread))
            .map((p) => ({ x: p.x, y: p.spread as number })),
          yAxisID: "y2",
          backgroundColor: "rgba(148, 163, 184, 0.18)",
          borderWidth: 0,
          barPercentage: 0.85,
          categoryPercentage: 0.8,
          borderRadius: 4,
          borderSkipped: false,
          transitions: {
            hide: {
              animation: {
                duration: 0,
              },
            },
            show: {
              animation: {
                duration: 0,
              },
            },
          },
        },

        // long line
        {
          type: "line" as const,
          label: `Long: ${formatExchange(selectedLongEx || "")}`,
          data: points
            .filter((p) => Number.isFinite(p.long))
            .map((p) => ({ x: p.x, y: p.long as number })),
          borderColor: COLORS.chart.success,
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          tension: 0.25,
        },

        // short line
        {
          type: "line" as const,
          label: `Short: ${formatExchange(selectedShortEx || "")}`,
          data: points
            .filter((p) => Number.isFinite(p.short))
            .map((p) => ({ x: p.x, y: p.short as number })),
          borderColor: COLORS.chart.danger,
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          tension: 0.25,
        },
      ],
    };
  }, [rows, selectedLongEx, selectedShortEx]);

  const { minX, maxX } = useMemo(() => {
    const xs = rows
      .map((r) => (r?.h ? new Date(r.h).getTime() : NaN))
      .filter((x) => Number.isFinite(x)) as number[];

    if (!xs.length) return { minX: Date.now() - 30 * 24 * 3600 * 1000, maxX: Date.now() };

    return { minX: Math.min(...xs), maxX: Math.max(...xs) };
  }, [rows]);

  const FULL_RANGE = Math.max(1, maxX - minX);
  const MIN_RANGE = CHART_CONFIG.SEVEN_DAYS_MS;

  const options = useMemo<ChartOptions<"bar">>(
    () => ({
      animation: false,
      transitions: {
        zoom: {
          animation: {
            duration: 0,
          },
        },
        pan: {
          animation: {
            duration: 0,
          },
        },
      },
      responsive: true,
      maintainAspectRatio: false,
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
              maxRange: FULL_RANGE,
              minRange: MIN_RANGE,
            },
          },
        },
        legend: { display: true, labels: { color: COLORS.text.primary } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y;
              if (v == null) return "";
              const name = ctx.dataset.label ?? "";
              return `${name}: ${Number(v).toFixed(2)}%`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: { tooltipFormat: CHART_CONFIG.TOOLTIP_FORMAT },
          ticks: { autoSkip: true, maxRotation: 0, color: COLORS.text.secondary },
          grid: { color: COLORS.chart.grid },
        },
        y: {
          position: "left",
          ticks: {
            color: COLORS.text.secondary,
            callback: (value) => (typeof value === "number" ? `${value}%` : ""),
          },
          grid: {
            color: (ctx) =>
              ctx.tick?.value === 0
                ? COLORS.chart.gridZero
                : COLORS.chart.grid,
            lineWidth: (ctx) => (ctx.tick?.value === 0 ? 1.2 : 1),
          },
        },
        y2: {
          position: "right",
          ticks: {
            color: COLORS.text.secondary,
            callback: (value) => (typeof value === "number" ? `${value}%` : ""),
          },
          grid: { drawOnChartArea: false },
        },
      },
    }),
    [minX, maxX, FULL_RANGE]
  );

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-200">Funding Rates</h2>

      {!isLoaded ? (
        <div className="h-96 flex items-center justify-center text-gray-500 rounded border border-gray-700">
          <p>Run a backtest to see funding rates as line charts and spread as bars.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chart Container */}
          {loading && (
            <div className="h-96 flex items-center justify-center text-gray-500 rounded border border-gray-700">
              <p>Loading chart data...</p>
            </div>
          )}

          {err && (
            <div className="h-96 flex items-center justify-center text-red-400 rounded border border-red-800 bg-red-950/20">
              <p>{err}</p>
            </div>
          )}

          {!loading && !err && rows.length === 0 && (
            <div className="h-96 flex items-center justify-center text-gray-500 rounded border border-gray-700">
              <p>No data available for this period.</p>
            </div>
          )}

          {!loading && !err && rows.length > 0 && (
            <div className="border border-gray-700 rounded p-4 bg-gray-900 h-96">
              <Chart
                key={`chart-${chartData.longMarketId}-${chartData.shortMarketId}-${chartKey}`}
                type="bar"
                data={chartDataObj as any}
                options={options}
              />
            </div>
          )}

          {/* Exchange Buttons */}
          {!loading && rows.length > 0 && (
            <div className="flex gap-3 justify-center">
              {chartData.longRefUrl && (
                <a
                  href={chartData.longRefUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-semibold">{formatExchange(selectedLongEx || "")}</span>
                  <ExternalLink size={16} />
                </a>
              )}

              {chartData.shortRefUrl && (
                <a
                  href={chartData.shortRefUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-semibold">{formatExchange(selectedShortEx || "")}</span>
                  <ExternalLink size={16} />
                </a>
              )}

              {USE_CHART_CACHE && (
                <button
                  onClick={() => setForceRefresh(true)}
                  disabled={loading}
                  className="px-4 py-2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 transition"
                >
                  {loading ? "Refreshing..." : "Force Refresh"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
