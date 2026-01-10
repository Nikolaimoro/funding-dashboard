"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  UTCTimestamp,
} from "lightweight-charts";

/* ================= TYPES ================= */

type ChartPoint = {
  funding_time: string; // ISO
  apr: number;          // APR в процентах (например 123.45)
};

interface FundingChartProps {
  data: ChartPoint[];
  title: string;
}

/* ================= COMPONENT ================= */

export default function FundingChart({ data, title }: FundingChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (data.length === 0) return;

    /* ---------- create chart ---------- */
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 420,

      layout: {
        background: { color: "#0f172a" }, // slate-900
        textColor: "#cbd5e1",              // slate-300
      },

      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },

      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#334155",
      },

      rightPriceScale: {
        borderColor: "#334155",
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
      },

      crosshair: {
        mode: 1, // normal
      },

      handleScroll: {
        mouseWheel: false, // ❌ без зума
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },

      handleScale: {
        mouseWheel: false,
        pinch: false,
        axisPressedMouseMove: false,
      },
    });

    chartRef.current = chart;

    /* ---------- add series ---------- */
    const series = chart.addLineSeries({
      color: "#60a5fa", // blue-400
      lineWidth: 2,
      crosshairMarkerVisible: true,

      // ❌ убираем пунктирную линию последнего значения
      lastValueVisible: false,
      priceLineVisible: false,
    });

    seriesRef.current = series;

    /* ---------- format data ---------- */
    const formatted: LineData[] = data.map((d) => ({
      time: Math.floor(
        new Date(d.funding_time).getTime() / 1000
      ) as UTCTimestamp,
      value: d.apr,
    }));

    series.setData(formatted);

    chart.timeScale().fitContent();

    /* ---------- resize handling ---------- */
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });

    resizeObserver.observe(containerRef.current);

    /* ---------- cleanup ---------- */
    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [data]);

  /* ================= RENDER ================= */

  return (
    <div className="w-full">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-200">
          {title}
        </h3>
        <p className="text-xs text-gray-400">
          Funding APR · auto-scaled · drag to scroll
        </p>
      </div>

      <div
        ref={containerRef}
        className="w-full rounded border border-gray-700 overflow-hidden"
      />
    </div>
  );
}