"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
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

/* ---------- register ---------- */
ChartJS.register(
  // controllers
  LineController,
  BarController,

  // elements
  LineElement,
  PointElement,
  BarElement,

  // scales
  LinearScale,
  TimeScale,

  // plugins
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

/* ================= TYPES ================= */

export type ArbChartRow = {
  h: string; // timestamptz ISO
  long_apr: number | null;
  short_apr: number | null;
  spread_apr: number | null;
};

export type ArbitrageChartProps = {
  open: boolean;
  onClose: () => void;

  baseAsset: string;

  longMarketId: number;
  shortMarketId: number;

  longLabel: string;  // например "Binance (USDT)"
  shortLabel: string; // например "Bybit (USDC)"
};

async function fetchArbChartData(params: {
  longMarketId: number;
  shortMarketId: number;
  days?: number;
}): Promise<ArbChartRow[]> {
  const { longMarketId, shortMarketId, days = 30 } = params;

  const { data, error } = await supabase.rpc("get_arb_chart_data", {
    p_long_market_id: longMarketId,
    p_short_market_id: shortMarketId,
    p_days: days,
  });

  if (error) throw error;

  // Supabase типизирует data как unknown — приводим аккуратно
  return (data ?? []) as ArbChartRow[];
}

/* ================= COMPONENT ================= */

export default function ArbitrageChart(props: ArbitrageChartProps) {
  const { open, onClose, baseAsset, longMarketId, shortMarketId, longLabel, shortLabel } = props;

  const [rows, setRows] = useState<ArbChartRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setErr("");
    setRows([]);

    fetchArbChartData({
      longMarketId,
      shortMarketId,
      days: 30,
    })
      .then((d) => {
        if (cancelled) return;
        setRows(d);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setErr(e?.message ?? "Failed to load chart data");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, longMarketId, shortMarketId]);

  const chartData = useMemo(() => {
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
        // spread bars (вторичная ось справа)
        {
          type: "bar" as const,
          label: "Spread (APR %)",
          data: points
            .filter((p) => Number.isFinite(p.spread))
            .map((p) => ({ x: p.x, y: p.spread as number })),
          yAxisID: "y2",
          backgroundColor: "rgba(148, 163, 184, 0.18)", // slate-ish
          borderWidth: 0,
          barPercentage: 1.0,
          categoryPercentage: 1.0,
        },

        // long line
        {
          type: "line" as const,
          label: `Long: ${longLabel}`,
          data: points
            .filter((p) => Number.isFinite(p.long))
            .map((p) => ({ x: p.x, y: p.long as number })),
          borderColor: "#34d399", // emerald-400
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          tension: 0.25,
        },

        // short line
        {
          type: "line" as const,
          label: `Short: ${shortLabel}`,
          data: points
            .filter((p) => Number.isFinite(p.short))
            .map((p) => ({ x: p.x, y: p.short as number })),
          borderColor: "#f87171", // red-400
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

  const FULL_RANGE = Math.max(1, maxX - minX); // 30 дней (или сколько реально пришло)
  const MIN_RANGE = 7 * 24 * 60 * 60 * 1000;  // 7 дня в мс

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

        legend: { display: true, labels: { color: "#cbd5e1" } },
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
          time: { tooltipFormat: "yyyy-MM-dd HH:mm" },
          ticks: { autoSkip: true, maxRotation: 0, color: "#9ca3af" },
          grid: { color: "rgba(148, 163, 184, 0.06)" },
        },
        y: {
          position: "left",
          ticks: {
            color: "#9ca3af",
            callback: (value) => (typeof value === "number" ? `${value}%` : ""),
          },
          grid: {
            color: (ctx) =>
              ctx.tick?.value === 0
                ? "rgba(148, 163, 184, 0.35)"
                : "rgba(148, 163, 184, 0.08)",
            lineWidth: (ctx) => (ctx.tick?.value === 0 ? 1.2 : 1),
          },
        },
        y2: {
          position: "right",
          ticks: {
            color: "#9ca3af",
            callback: (value) => (typeof value === "number" ? `${value}%` : ""),
          },
          grid: { drawOnChartArea: false },
        },
      },
    }),
    [minX, maxX, FULL_RANGE]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* modal */}
      <div className="absolute left-1/2 top-1/2 w-[min(1100px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-800 px-4 py-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-gray-100 truncate">
              {baseAsset} — Long: {longLabel} / Short: {shortLabel}
            </div>
          </div>
        </div>

        {/* body */}
        <div className="px-4 py-4">

{loading ? (
  <div className="h-[520px] w-full flex items-center justify-center">
    <div className="flex items-center gap-3 text-gray-300">
      <div className="h-5 w-5 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  </div>
) : err ? (
  <div className="h-[520px] w-full flex items-center justify-center">
    <div className="text-red-400 text-sm">{err}</div>
  </div>
) : (

<div className="h-[520px] w-full">
  {loading && (
    <div className="flex h-full items-center justify-center text-gray-400">
      Loading…
    </div>
  )}

  {!loading && rows.length > 0 && (
    <Chart
      key={`${longMarketId}-${shortMarketId}`}
      type="bar"
      data={chartData as any}
      options={options}
    />
  )}
</div>
)}

        </div>
      </div>
    </div>
  );
}