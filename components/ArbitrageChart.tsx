"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Modal } from "@/components/ui/Modal";
import { COLORS, CHART_CONFIG } from "@/lib/theme";
import { RPC_FUNCTIONS } from "@/lib/constants";
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
  longLabel: string;
  shortLabel: string;
};

async function fetchArbChartData(params: {
  longMarketId: number;
  shortMarketId: number;
  days?: number;
}): Promise<ArbChartRow[]> {
  const { longMarketId, shortMarketId, days = 30 } = params;

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
        setErr(e?.message ?? "Failed to load chart. Please try again.");
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
          backgroundColor: "rgba(148, 163, 184, 0.18)",
          borderWidth: 0,
          barPercentage: 0.85,
          categoryPercentage: 0.8,
          borderRadius: 4,
          borderSkipped: false,
        },

        // long line
        {
          type: "line" as const,
          label: `Long: ${longLabel}`,
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
          label: `Short: ${shortLabel}`,
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

  if (!open) return null;

  const title = `${baseAsset} — Long: ${longLabel} / Short: ${shortLabel}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      loading={loading}
      error={err}
      height={CHART_CONFIG.MODAL_HEIGHT}
    >
      {rows.length > 0 && (
        <Chart
          key={`${longMarketId}-${shortMarketId}`}
          type="bar"
          data={chartData as any}
          options={options}
        />
      )}
    </Modal>
  );
}