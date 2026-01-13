"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Modal } from "@/components/ui/Modal";
import { COLORS, CHART_CONFIG, TAILWIND } from "@/lib/theme";
import { RPC_FUNCTIONS } from "@/lib/constants";
import { FundingChartPoint } from "@/lib/types";
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
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";
import { Line } from "react-chartjs-2";

/* ---------- register ---------- */
ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

/* ================= TYPES ================= */

export type FundingChartProps = {
  open: boolean;
  onClose: () => void;
  marketId: number;
  symbol: string;
  exchange: string;
};

/* ================= FETCH ================= */

async function fetchFundingChartData(params: {
  marketId: number;
  days?: number;
}): Promise<FundingChartPoint[]> {
  const { marketId, days = 30 } = params;

  // Add 10 second timeout to prevent infinite loading
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timeout. Please try again.")), 10000)
  );

  const fetchPromise = supabase.rpc(RPC_FUNCTIONS.FUNDING_CHART, {
    p_market_id: marketId,
    p_days: days,
  });

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise as any]);

  if (error) throw error;

  return (data ?? []) as FundingChartPoint[];
}

/* ================= COMPONENT ================= */

export default function FundingChart(props: FundingChartProps) {
  const { open, onClose, marketId, symbol, exchange } = props;

  const [rows, setRows] = useState<FundingChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setErr("");
    setRows([]);

    fetchFundingChartData({
      marketId,
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
  }, [open, marketId]);

  /* ---------- unified data processing ---------- */
  const { chartPoints, minX, maxX } = useMemo(() => {
    const filtered = rows.filter(d => Number.isFinite(d.apr));
    
    const chartPoints = filtered.map(d => ({
      x: new Date(d.funding_time).getTime(),
      y: d.apr,
    }));

    const xs = chartPoints.map(p => p.x).filter(x => Number.isFinite(x));
    
    let min = Date.now() - CHART_CONFIG.THIRTY_DAYS_MS, max = Date.now();
    if (xs.length > 0) {
      min = Math.min(...xs);
      max = Math.max(...xs);
    }

    return { chartPoints, minX: min, maxX: max };
  }, [rows]);

  const fullRange = Math.max(1, maxX - minX);
  const minRange = CHART_CONFIG.SEVEN_DAYS_MS;

  const chartData = useMemo(
    () => ({
      datasets: [
        {
          label: "APR %",
          data: chartPoints,
          parsing: false as const, 
          borderColor: COLORS.chart.primary,
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 8,
          tension: 0.25,
        },
      ],
    }),
    [chartPoints]
  );

  /* ---------- memoized callbacks ---------- */
  const tooltipLabelCallback = useMemo(
    () => (ctx: any) => {
      const v = ctx.parsed.y;
      return v != null ? `APR: ${v.toFixed(2)}%` : "";
    },
    []
  );

  const yTickCallback = useMemo(
    () => (value: string | number) =>
      typeof value === "number" ? `${value}%` : "",
    []
  );

  const gridColorCallback = useMemo(
    () => (ctx: any) =>
      ctx.tick?.value === 0
        ? COLORS.chart.gridZero
        : COLORS.chart.grid,
    []
  );

  const gridLineWidthCallback = useMemo(
    () => (ctx: any) => (ctx.tick?.value === 0 ? 1.2 : 1),
    []
  );

  /* ---------- chart options ---------- */
  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,

      animation: {
        duration: 300,
      },

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

      interaction: {
        mode: "index",
        intersect: false,
      },

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
          callbacks: {
            label: tooltipLabelCallback,
          },
        },
      },

      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: CHART_CONFIG.TOOLTIP_FORMAT,
          },
          ticks: {
            autoSkip: true,
            maxRotation: 0,
            color: COLORS.text.secondary,
          },
          grid: {
            color: COLORS.chart.grid,
          },
        },

        y: {
          beginAtZero: false,
          ticks: {
            color: COLORS.text.secondary,
            callback: yTickCallback,
          },
          grid: {
            color: gridColorCallback,
            lineWidth: gridLineWidthCallback,
          },
        },
      },
    }),
    [tooltipLabelCallback, yTickCallback, gridColorCallback, gridLineWidthCallback, minX, maxX, fullRange, minRange]
  );

  const title = `${symbol} — ${exchange}`;

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
        <Line
          key={`${marketId}`}
          data={chartData}
          options={options}
        />
      )}
    </Modal>
  );
}