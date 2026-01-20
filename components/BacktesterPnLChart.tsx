"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { COLORS, CHART_CONFIG } from "@/lib/theme";
import { RPC_FUNCTIONS } from "@/lib/constants";
import { formatCompactUSD } from "@/lib/formatters";
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

interface PnLRow {
  t: string;
  short_rate_pct: number | null;
  long_rate_pct: number | null;
  spread_pct: number | null;
  cum_spread_pct: number | null;
}

interface BacktesterPnLChartProps {
  chartData: BacktesterChartData | null;
  runToken?: number;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatWholeCurrency(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

async function fetchPnLData(params: {
  longMarketId: number;
  shortMarketId: number;
  days?: number;
}): Promise<PnLRow[]> {
  const { longMarketId, shortMarketId, days = 30 } = params;

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timeout. Please try again.")), 10000)
  );

  const fetchPromise = supabase.rpc(RPC_FUNCTIONS.ARB_PNL, {
    p_long_market_id: longMarketId,
    p_short_market_id: shortMarketId,
    p_days: days,
  });

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise as any]);

  if (error) throw error;

  return (data ?? []) as PnLRow[];
}

export default function BacktesterPnLChart({ chartData, runToken }: BacktesterPnLChartProps) {
  const [rows, setRows] = useState<PnLRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // Inputs
  const [positionInput, setPositionInput] = useState<string>("10,000");
  const [executionCostInput, setExecutionCostInput] = useState<string>("0.4");
  const [days, setDays] = useState<number>(30);

  const isLoaded = !!chartData?.longMarketId && !!chartData?.shortMarketId;

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;
    setLoading(true);
    setErr("");
    setRows((prev) => prev);

    fetchPnLData({
      longMarketId: chartData.longMarketId,
      shortMarketId: chartData.shortMarketId,
      days,
    })
      .then((d) => {
        if (cancelled) return;
        setRows(d);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setErr(e?.message ?? "Failed to load PnL data. Please try again.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, chartData?.longMarketId, chartData?.shortMarketId, days, runToken]);

  const parsedPositionSize = useMemo(() => {
    const normalized = positionInput.replace(/,/g, "").replace(/[^\d]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [positionInput]);

  const executionCost = useMemo(() => {
    const parsed = Number(executionCostInput);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0.4;
  }, [executionCostInput]);

  const positionSize = parsedPositionSize > 0 ? parsedPositionSize : 10000;
  const totalPositionSize = positionSize * 2;
  const totalExecutionCost = useMemo(() => {
    const execCostDecimal = executionCost / 100;
    return positionSize * execCostDecimal;
  }, [executionCost, positionSize]);

  // Calculate PnL values
  const pnlCalculations = useMemo(() => {
    if (rows.length === 0) {
      return {
        eventPnL: [] as { x: number; y: number }[],
        cumPnL: [] as { x: number; y: number }[],
        totalFundingPnL: 0,
        totalExecutionCost: 0,
        totalPnL: 0,
      };
    }

    // Execution cost is total for open + close across both legs
    const execCostDecimal = executionCost / 100;
    const totalExecutionCost = positionSize * execCostDecimal;

    // Each spread_pct is already a percentage
    // For position PnL: (spread_pct / 100) * positionSize
    const eventPnL: { x: number; y: number; isFirst?: boolean; isLast?: boolean }[] = [];
    let cumulativePnL = 0;
    const cumPnL: { x: number; y: number }[] = [];

    rows.forEach((row, index) => {
      if (!row.t) return;
      const timestamp = new Date(row.t).getTime();
      const spreadPct = row.spread_pct ?? 0;

      // Event PnL from funding
      let eventPnLValue = (spreadPct / 100) * positionSize;

      // Apply half of total execution cost on first bar (opening)
      if (index === 0) {
        eventPnLValue -= totalExecutionCost / 2;
      }
      // Apply half of total execution cost on last bar (closing)
      if (index === rows.length - 1) {
        eventPnLValue -= totalExecutionCost / 2;
      }

      cumulativePnL += eventPnLValue;

      eventPnL.push({ x: timestamp, y: eventPnLValue });
      cumPnL.push({ x: timestamp, y: cumulativePnL });
    });

    // Calculate total funding PnL (without execution cost)
    const totalFundingPnL = rows.reduce((sum, row) => {
      const spreadPct = row.spread_pct ?? 0;
      return sum + (spreadPct / 100) * positionSize;
    }, 0);

    return {
      eventPnL,
      cumPnL,
      totalFundingPnL,
      totalExecutionCost,
      totalPnL: totalFundingPnL - totalExecutionCost,
    };
  }, [rows, positionSize, executionCost]);

  const chartDataObj = useMemo(() => {
    return {
      datasets: [
        // Event PnL bars (green/red based on value)
        {
          type: "bar" as const,
          label: "Event PnL",
          data: pnlCalculations.eventPnL,
          yAxisID: "y2",
          backgroundColor: pnlCalculations.eventPnL.map((p) =>
            p.y >= 0 ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)"
          ),
          borderColor: pnlCalculations.eventPnL.map((p) =>
            p.y >= 0 ? "rgba(34, 197, 94, 1)" : "rgba(239, 68, 68, 1)"
          ),
          borderWidth: 1,
          barPercentage: 0.85,
          categoryPercentage: 0.8,
          borderRadius: 2,
          borderSkipped: false,
        },
        // Cumulative PnL line
        {
          type: "line" as const,
          label: "Cumulative PnL",
          data: pnlCalculations.cumPnL,
          yAxisID: "y",
          borderColor: "rgba(148, 163, 184, 1)",
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          tension: 0.25,
          fill: false,
        },
      ],
    };
  }, [pnlCalculations]);

  const { minX, maxX } = useMemo(() => {
    const xs = rows
      .map((r) => (r?.t ? new Date(r.t).getTime() : NaN))
      .filter((x) => Number.isFinite(x)) as number[];

    if (!xs.length) return { minX: Date.now() - 30 * 24 * 3600 * 1000, maxX: Date.now() };

    return { minX: Math.min(...xs), maxX: Math.max(...xs) };
  }, [rows]);

  const FULL_RANGE = Math.max(1, maxX - minX);
  const MIN_RANGE = CHART_CONFIG.SEVEN_DAYS_MS;

  const options = useMemo<ChartOptions<"bar">>(
    () => ({
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        zoom: {
          pan: { enabled: true, mode: "x" },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "x",
          },
          limits: {
            x: { min: minX, max: maxX, maxRange: FULL_RANGE, minRange: MIN_RANGE },
          },
        },
        legend: { display: true, labels: { color: COLORS.text.primary } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y;
              if (v == null || !Number.isFinite(v)) return "";
              const name = ctx.dataset.label ?? "";
              const sign = v >= 0 ? "+" : "";
              return `${name}: ${sign}$${v.toFixed(2)}`;
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
          title: { display: true, text: "Cumulative PnL ($)", color: COLORS.text.secondary },
          ticks: {
            color: COLORS.text.secondary,
            callback: (value) => (typeof value === "number" ? `$${value}` : ""),
          },
          grid: {
            color: (ctx) => (ctx.tick?.value === 0 ? COLORS.chart.gridZero : COLORS.chart.grid),
            lineWidth: (ctx) => (ctx.tick?.value === 0 ? 1.2 : 1),
          },
        },
        y2: {
          position: "right",
          title: { display: true, text: "Event PnL ($)", color: COLORS.text.secondary },
          ticks: {
            color: COLORS.text.secondary,
            callback: (value) => (typeof value === "number" ? `$${value}` : ""),
          },
          grid: { drawOnChartArea: false },
        },
      },
    }),
    [minX, maxX, FULL_RANGE]
  );

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="bg-[#292e40] border border-[#343a4e] rounded-xl p-6 mt-6">
      <h2 className="text-lg font-roboto font-normal mb-4 text-gray-200">
        PnL Calculator
      </h2>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Panel - Inputs & Summary */}
        <div className="w-full lg:w-64 shrink-0 space-y-4">
          {/* Time Window */}
          <div className="bg-[#1c202f] border border-[#343a4e] rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-2">Time Window</div>
            <div className="flex flex-wrap gap-2">
              {[1, 3, 7, 15, 30].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDays(value)}
                  className={`px-2.5 py-1 rounded text-xs border transition ${
                    days === value
                      ? "bg-[#343a4e] border-[#47506b] text-white"
                      : "bg-transparent border-[#343a4e] text-gray-400 hover:text-white"
                  }`}
                >
                  {value}d
                </button>
              ))}
            </div>
          </div>
          {/* Inputs */}
          <div className="bg-[#1c202f] border border-[#343a4e] rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Parameters</h3>
            
            <div>
              <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <span>Position Size ($)</span>
                <span className="relative group inline-flex items-center">
                  <Info size={14} className="text-gray-400" />
                  <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 p-2 rounded-md bg-[#292e40] border border-[#343a4e] text-[11px] text-gray-300 shadow-lg">
                    <span>Position Size per leg</span>
                    <span className="mt-1 block text-gray-400">Total (long + short): {formatWholeCurrency(totalPositionSize)}</span>
                  </span>
                </span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={positionInput}
                onChange={(e) => setPositionInput(e.target.value)}
                onBlur={() => {
                  if (!positionInput.trim() || parsedPositionSize <= 0) {
                    setPositionInput("10,000");
                    return;
                  }
                  const normalized = parsedPositionSize
                    .toLocaleString("en-US", { maximumFractionDigits: 0 });
                  setPositionInput(normalized);
                }}
                className="w-full px-3 py-2 bg-[#292e40] border border-[#343a4e] rounded text-white text-sm focus:outline-none focus:border-[#4a5568]"
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <span>Execution Cost (%)</span>
                <span className="relative group inline-flex items-center">
                  <Info size={14} className="text-gray-400" />
                  <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 p-2 rounded-md bg-[#292e40] border border-[#343a4e] text-[11px] text-gray-300 shadow-lg">
                    <span>Execution Cost (open + close, both legs)</span>
                    <span className="mt-1 block text-gray-400">Includes slippage + fees</span>
                  </span>
                </span>
              </label>
              <input
                type="number"
                value={executionCostInput}
                onChange={(e) => setExecutionCostInput(e.target.value)}
                onBlur={() => {
                  if (!executionCostInput.trim()) {
                    setExecutionCostInput("0.4");
                  }
                }}
                className="w-full px-3 py-2 bg-[#292e40] border border-[#343a4e] rounded text-white text-sm focus:outline-none focus:border-[#4a5568]"
                min={0}
                step={0.1}
              />
            </div>
          </div>

          {/* PnL Summary */}
          <div className="bg-[#1c202f] border border-[#343a4e] rounded-lg p-4 space-y-3 min-h-[190px]">
            <h3 className="text-sm font-medium text-gray-400 mb-2">PnL Summary</h3>
            
            {loading ? (
              <div className="text-gray-500 text-sm">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="text-gray-500 text-sm">No data</div>
            ) : (
              <>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Total PnL</div>
                  <div
                    className={`text-xl font-bold font-mono tabular-nums ${
                      pnlCalculations.totalPnL >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {pnlCalculations.totalPnL >= 0 ? "+" : ""}
                    ${pnlCalculations.totalPnL.toFixed(2)}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#343a4e] space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Funding PnL</span>
                    <span
                      className={`font-mono tabular-nums ${
                        pnlCalculations.totalFundingPnL >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {pnlCalculations.totalFundingPnL >= 0 ? "+" : ""}
                      ${pnlCalculations.totalFundingPnL.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Execution Cost</span>
                    <span className="font-mono tabular-nums text-red-400">
                      -${pnlCalculations.totalExecutionCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Chart */}
        <div className="flex-1 min-w-0">
          <div className="relative border border-[#343a4e] rounded p-4 bg-[#292e40] h-72">
            {rows.length > 0 ? (
              <Chart
                key={`pnl-chart-${chartData.longMarketId}-${chartData.shortMarketId}`}
                type="bar"
                data={chartDataObj as any}
                options={options}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <p>No data available for this period.</p>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-200 bg-[#1c202f]/60">
                <p>Loading PnL data...</p>
              </div>
            )}

            {err && (
              <div className="absolute inset-0 flex items-center justify-center text-red-400 bg-red-950/40">
                <p>{err}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
