"use client";

import { useMemo } from "react";
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

export type FundingChartPoint = {
  funding_time: string; // ISO string
  apr: number;
};

type FundingChartProps = {
  data: FundingChartPoint[];
};

/* ================= COMPONENT ================= */

export default function FundingChart({ data }: FundingChartProps) {
  /* ---------- chart data ---------- */
  const chartData = useMemo(
    () => ({
      datasets: [
        {
          label: "APR %",
          data: data
            .filter(d => Number.isFinite(d.apr))
            .map(d => ({
              x: new Date(d.funding_time).getTime(),
              y: d.apr,
            })),
          borderColor: "#60a5fa", // blue-400
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 8,
          tension: 0.25,
        },
      ],
    }),
    [data]
  );

  /* ---------- chart options ---------- */
  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: "index",
        intersect: false,
      },

      plugins: {
        legend: { display: false },

        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              return v != null ? `APR: ${v.toFixed(2)}%` : "";
            },
          },
        },

        /* =========================
           PAN / ZOOM — ВРЕМЕННО ВЫКЛЮЧЕНО
           (оставлено для будущего)
        ========================== */
        /*
        zoom: {
          pan: {
            enabled: true,
            mode: "x",
          },
          zoom: {
            wheel: { enabled: false },
            pinch: { enabled: false },
            drag: { enabled: false },
            mode: "x",
          },
        },
        */
      },

      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: "yyyy-MM-dd HH:mm",
          },
          ticks: {
            autoSkip: true,
            maxRotation: 0,
            color: "#9ca3af",
          },
          grid: {
            color: "rgba(148, 163, 184, 0.06)",
          },
        },

        y: {
          beginAtZero: false,
          ticks: {
            color: "#9ca3af",
            callback: value =>
              typeof value === "number" ? `${value}%` : "",
          },
          grid: {
            color: ctx =>
              ctx.tick?.value === 0
                ? "rgba(148, 163, 184, 0.35)"
                : "rgba(148, 163, 184, 0.08)",
            lineWidth: ctx => (ctx.tick?.value === 0 ? 1.2 : 1),
          },
        },
      },
    }),
    []
  );

  /* ---------- render ---------- */
  return (
    <div className="w-full">
      <div className="h-[420px] w-full">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}