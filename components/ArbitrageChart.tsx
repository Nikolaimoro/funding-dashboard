"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import ExchangeIcon from "@/components/ui/ExchangeIcon";
import { Modal } from "@/components/ui/Modal";
import { COLORS, CHART_CONFIG } from "@/lib/theme";
import { ArbChartRow } from "@/lib/types";
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
import { isValidUrl } from "@/lib/validation";

/* ---------- register ---------- */
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

/* ================= TYPES ================= */

export type ArbitrageChartProps = {
  open: boolean;
  onClose: () => void;
  baseAsset: string;
  longMarketId: number;
  shortMarketId: number;
  longExchange: string;
  shortExchange: string;
  longLabel: string;
  shortLabel: string;
  longUrl?: string | null;
  shortUrl?: string | null;
  backtesterUrl?: string | null;
};

async function fetchArbChartData(params: {
  longMarketId: number;
  shortMarketId: number;
  days?: number;
  signal?: AbortSignal;
}): Promise<ArbChartRow[]> {
  const { longMarketId, shortMarketId, days = 30, signal } = params;
  const timeoutMs = 12000;
  const timeoutMessage = "Unable to load history. Please try again.";
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
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const res = await fetch(`/api/chart/arbitrage?longMarketId=${longMarketId}&shortMarketId=${shortMarketId}&days=${days}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const json = (await res.json()) as { rows?: ArbChartRow[] };
        return json.rows ?? [];
      }

      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        continue;
      }

      throw new Error("Unable to load history. Please try again.");
    }

    return [];
  } catch (err) {
    if (timedOut) {
      throw new Error(timeoutMessage);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ================= COMPONENT ================= */

export default function ArbitrageChart(props: ArbitrageChartProps) {
  const { open, onClose, baseAsset, longMarketId, shortMarketId, longExchange, shortExchange, longLabel, shortLabel, longUrl, shortUrl, backtesterUrl } = props;
  const hasBacktester =
    typeof backtesterUrl === "string" &&
    (backtesterUrl.startsWith("/") && !backtesterUrl.startsWith("//") ||
      isValidUrl(backtesterUrl));
  const hasLong = isValidUrl(longUrl);
  const hasShort = isValidUrl(shortUrl);
  const hasLinks = hasLong || hasShort || hasBacktester;

  const [rows, setRows] = useState<ArbChartRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setErr("");
    setRows([]);

    fetchArbChartData({
      longMarketId,
      shortMarketId,
      days: 30,
      signal: controller.signal,
    })
      .then((d) => {
        if (cancelled) return;
        setRows(d);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setErr(e?.message ?? "Unable to load history. Please try again.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, longMarketId, shortMarketId, retryKey]);

  const chartData = useMemo(() => {
    const allPoints = rows
      .filter((r) => r.h)
      .map((r) => ({
        x: new Date(r.h).getTime(),
        long: r.long_apr,
        short: r.short_apr,
        spread: r.spread_apr,
      }));

    // Create a unified grid of all X coordinates (timestamps) from all datasets
    // This ensures all datasets align on the same time axis
    const allXValues = new Set<number>();
    allPoints.forEach(p => allXValues.add(p.x));
    const unifiedXs = Array.from(allXValues).sort((a, b) => a - b);

    // Create a map for quick lookup
    const pointMap = new Map<number, typeof allPoints[0]>();
    allPoints.forEach(p => pointMap.set(p.x, p));

    // For each X value, create data points with null values where data doesn't exist
    const unifiedPoints = unifiedXs.map(x => pointMap.get(x) || { x, long: null, short: null, spread: null });

    return {
      datasets: [
        // spread bars (вторичная ось справа)
        {
          type: "bar" as const,
          label: "Spread (APR %)",
          data: unifiedPoints.map((p) => ({ 
            x: p.x, 
            y: Number.isFinite(p.spread) ? p.spread : null
          })),
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
          label: `Long: ${longLabel}`,
          data: unifiedPoints.map((p) => ({ 
            x: p.x, 
            y: Number.isFinite(p.long) ? p.long : null
          })),
          borderColor: COLORS.chart.success,
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          tension: 0.25,
        },

        // short line
        {
          type: "line" as const,
          label: `Short: ${shortLabel}`,
          data: unifiedPoints.map((p) => ({ 
            x: p.x, 
            y: Number.isFinite(p.short) ? p.short : null
          })),
          borderColor: COLORS.chart.danger,
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          tension: 0.25,
        },
      ],
    };
  }, [rows, longLabel, shortLabel]);

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

        animation: {
            duration: 600,        // было ~1000 по умолчанию
            easing: "linear",
        },

            transitions: {
      zoom: {
        animation: {
          duration: 0, // ❗️убираем анимацию при zoom
        },
      },
      pan: {
        animation: {
          duration: 0, // ❗️убираем анимацию при pan
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
      min: minX,          // ✅ не уедем левее исходного
      max: maxX,          // ✅ не уедем правее исходного
      maxRange: FULL_RANGE, // ✅ нельзя отдалить сильнее, чем исходный full-range
      minRange: MIN_RANGE,  // ✅ нельзя приблизить сильнее, чем окно < 3 дней
    },
  },
},

        legend: {
          display: true,
          labels: {
            color: COLORS.text.primary,
            usePointStyle: true,
            pointStyle: "rectRounded",
            boxWidth: 10,
            boxHeight: 10,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y;
              // Show only if value exists (not null/NaN)
              if (v == null || !Number.isFinite(v)) return "";
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

  if (!open) return null;

  const title = `${baseAsset} — Long: ${longLabel} / Short: ${shortLabel}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      loading={loading}
      error={err}
      onRetry={() => setRetryKey((value) => value + 1)}
      height={CHART_CONFIG.MODAL_HEIGHT}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 min-h-[320px] sm:min-h-[440px]">
          {rows.length > 0 && (
            <Chart
              key={`${longMarketId}-${shortMarketId}`}
              type="bar"
              data={chartData as any}
              options={options}
            />
          )}
        </div>
        {hasLinks && (
          <div className="mt-3 flex flex-col items-center gap-2">
            <div className="w-full max-w-[520px]">
              <div className={`grid gap-2 ${hasBacktester ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
                {hasLong && (
                  <a
                    href={longUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-green-500/40 px-4 py-2 text-xs text-green-400 hover:border-green-500/70 transition whitespace-nowrap"
                  >
                    <ExternalLink size={12} />
                    <ExchangeIcon exchange={longExchange} size={14} />
                    Long {longLabel}
                  </a>
                )}
                {hasShort && (
                  <a
                    href={shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/40 px-4 py-2 text-xs text-red-400 hover:border-red-500/70 transition whitespace-nowrap"
                  >
                    <ExternalLink size={12} />
                    <ExchangeIcon exchange={shortExchange} size={14} />
                    Short {shortLabel}
                  </a>
                )}
                {hasBacktester && (
                  <a
                    href={backtesterUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-2 sm:col-span-1 inline-flex items-center justify-center rounded-lg border border-[#343a4e] px-3 py-2 text-xs text-gray-200 hover:border-white transition"
                  >
                    Backtester
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
