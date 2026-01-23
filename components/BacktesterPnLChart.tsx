"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, TrendingUp, DollarSign, Activity, ArrowUpRight, ArrowDownRight, Zap, Percent, Clock, BarChart3, Layers } from "lucide-react";
import { formatCompactUSD, formatExchange } from "@/lib/formatters";
import ExchangeIcon from "@/components/ui/ExchangeIcon";
import { COLORS, CHART_CONFIG } from "@/lib/theme";
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

function formatCurrency(value: number, decimals = 2) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function formatPercent(value: number, decimals = 2) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

async function fetchPnLData(params: {
  longMarketId: number;
  shortMarketId: number;
  days?: number;
  cacheBust?: number;
}): Promise<PnLRow[]> {
  const { longMarketId, shortMarketId, days = 30, cacheBust } = params;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timeout. Please try again.")), 10000)
  );
  const cacheParam = Number.isFinite(cacheBust) ? `&t=${cacheBust}` : "";
  const fetchPromise = fetch(
    `/api/chart/pnl?longMarketId=${longMarketId}&shortMarketId=${shortMarketId}&days=${days}${cacheParam}`
  );

  const res = (await Promise.race([fetchPromise, timeoutPromise as any])) as Response;

  if (!res.ok) throw new Error("Request timeout. Please try again.");

  const json = (await res.json()) as { rows?: PnLRow[] };
  return json.rows ?? [];
}

// Stat Card Component
function StatCard({ 
  icon: Icon, 
  iconColor, 
  label, 
  value, 
  subValue,
  subValueColor,
  className,
  alignSubValueBottom,
}: { 
  icon: React.ElementType; 
  iconColor: string; 
  label: string; 
  value: React.ReactNode; 
  subValue?: React.ReactNode;
  subValueColor?: string;
  className?: string;
  alignSubValueBottom?: boolean;
}) {
  return (
    <div className={`bg-[#1c202f] border border-[#343a4e] rounded-2xl p-4 min-w-[140px] flex flex-col ${className || ""}`}>
      <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
        <Icon size={14} className={iconColor} />
        <span>{label}</span>
      </div>
      <div className={`text-xl font-semibold text-gray-100 font-mono tabular-nums ${alignSubValueBottom ? "" : ""}`}>
        {value}
      </div>
      {subValue && (
        <div className={`text-xs ${alignSubValueBottom ? "mt-auto" : "mt-1"} ${subValueColor || "text-gray-500"}`}>
          {subValue}
        </div>
      )}
    </div>
  );
}

// Skeleton Stat Card for loading state
function StatCardSkeleton() {
  return (
    <div className="bg-[#1c202f] border border-[#343a4e] rounded-2xl p-4 min-w-[140px] animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3.5 h-3.5 rounded bg-[#343a4e]" />
        <div className="h-3 w-16 rounded bg-[#343a4e]" />
      </div>
      <div className="h-6 w-20 rounded bg-[#343a4e] mb-1" />
      <div className="h-3 w-12 rounded bg-[#343a4e]" />
    </div>
  );
}

export default function BacktesterPnLChart({ chartData, runToken }: BacktesterPnLChartProps) {
  const [rows, setRows] = useState<PnLRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [showPositionTip, setShowPositionTip] = useState(false);
  const [showCostTip, setShowCostTip] = useState(false);

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
      cacheBust: runToken,
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

  // Calculate PnL values and metrics
  const pnlCalculations = useMemo(() => {
    if (rows.length === 0) {
      return {
        eventPnL: [] as { x: number; y: number }[],
        cumPnL: [] as { x: number; y: number }[],
        totalFundingPnL: 0,
        totalExecutionCost: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        avgDailyPnL: 0,
        avgDailyPnLPercent: 0,
        apr: 0,
        sharpeRatio: 0,
        bestDay: { date: "", pnl: 0 },
        worstDay: { date: "", pnl: 0 },
        periodDays: 0,
        winRate: 0,
        winningDays: 0,
        paybackPeriod: null as number | null,
      };
    }

    // Execution cost is total for open + close across both legs
    const execCostDecimal = executionCost / 100;
    const totalExecutionCost = positionSize * execCostDecimal;

    // Each spread_pct is already a percentage
    // For position PnL: (spread_pct / 100) * positionSize
    const eventPnL: { x: number; y: number }[] = [];
    let cumulativePnL = 0;
    const cumPnL: { x: number; y: number }[] = [];
    const dailyPnLs: number[] = [];
    const dailyFundingPnLs: number[] = [];

    // Group by day for daily stats
    const dailyMap = new Map<string, number>();
    const dailyFundingMap = new Map<string, number>();

    rows.forEach((row, index) => {
      if (!row.t) return;
      const timestamp = new Date(row.t).getTime();
      const dateKey = row.t.slice(0, 10); // YYYY-MM-DD
      const spreadPct = row.spread_pct ?? 0;

      // Event PnL from funding
      const fundingPnLValue = (spreadPct / 100) * positionSize;
      let eventPnLValue = fundingPnLValue;

      // Apply half of total execution cost on first bar (opening)
      if (index === 0) {
        eventPnLValue -= totalExecutionCost / 2;
      }
      // Apply half of total execution cost on last bar (closing)
      if (index === rows.length - 1) {
        eventPnLValue -= totalExecutionCost / 2;
      }

      cumulativePnL += eventPnLValue;
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + eventPnLValue);
      dailyFundingMap.set(dateKey, (dailyFundingMap.get(dateKey) ?? 0) + fundingPnLValue);

      eventPnL.push({ x: timestamp, y: eventPnLValue });
      cumPnL.push({ x: timestamp, y: cumulativePnL });
    });

    // Calculate total funding PnL (without execution cost)
    const totalFundingPnL = rows.reduce((sum, row) => {
      const spreadPct = row.spread_pct ?? 0;
      return sum + (spreadPct / 100) * positionSize;
    }, 0);

    const totalPnL = totalFundingPnL - totalExecutionCost;
    const totalPnLPercent = (totalPnL / positionSize) * 100;

    // Daily metrics
    const dailyPnLArray = Array.from(dailyMap.entries());
    dailyPnLArray.forEach(([, pnl]) => dailyPnLs.push(pnl));

    const dailyFundingArray = Array.from(dailyFundingMap.entries());
    dailyFundingArray.forEach(([, pnl]) => dailyFundingPnLs.push(pnl));

    const periodDays = dailyPnLArray.length;
    const avgDailyPnL = periodDays > 0 ? totalPnL / periodDays : 0;
    const avgDailyPnLPercent = periodDays > 0 ? totalPnLPercent / periodDays : 0;

    // APR calculation
    const apr = avgDailyPnLPercent * 365;

    // Best and worst day (funding-only, without execution cost)
    let bestDay = { date: "", pnl: -Infinity };
    let worstDay = { date: "", pnl: Infinity };
    dailyFundingArray.forEach(([date, pnl]) => {
      if (pnl > bestDay.pnl) bestDay = { date, pnl };
      if (pnl < worstDay.pnl) worstDay = { date, pnl };
    });
    if (!Number.isFinite(bestDay.pnl)) bestDay = { date: "", pnl: 0 };
    if (!Number.isFinite(worstDay.pnl)) worstDay = { date: "", pnl: 0 };

    // Sharpe Ratio calculation
    // Using daily returns; risk-free rate assumed 0 for crypto
    const meanDailyReturn = dailyPnLs.length > 0 ? dailyPnLs.reduce((a, b) => a + b, 0) / dailyPnLs.length : 0;
    const variance = dailyPnLs.length > 1
      ? dailyPnLs.reduce((sum, v) => sum + Math.pow(v - meanDailyReturn, 2), 0) / (dailyPnLs.length - 1)
      : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (meanDailyReturn / stdDev) * Math.sqrt(365) : 0;

    // Win Rate calculation: days with PnL > 0
    const winningDays = dailyFundingPnLs.filter((pnl) => pnl > 0).length;
    const winRate = dailyFundingPnLs.length > 0 ? (winningDays / dailyFundingPnLs.length) * 100 : 0;

    // Payback Period calculation: days until execution cost is recovered
    // If avgDailyPnL (before execution cost deduction) is positive, calculate days to recover execution cost
    const avgDailyFundingPnL = periodDays > 0 ? totalFundingPnL / periodDays : 0;
    const paybackPeriod = avgDailyFundingPnL > 0 ? totalExecutionCost / avgDailyFundingPnL : null;

    return {
      eventPnL,
      cumPnL,
      totalFundingPnL,
      totalExecutionCost,
      totalPnL,
      totalPnLPercent,
      avgDailyPnL,
      avgDailyPnLPercent,
      apr,
      sharpeRatio,
      bestDay,
      worstDay,
      periodDays,
      winRate,
      winningDays,
      paybackPeriod,
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
            callback: (value) => (typeof value === "number" ? `$${value.toFixed(2)}` : ""),
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
            callback: (value) => (typeof value === "number" ? `$${value.toFixed(2)}` : ""),
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

  const hasData = rows.length > 0 && !loading;

  return (
    <div className="bg-[#292e40] border border-[#343a4e] rounded-2xl p-6 mt-6">
      {/* Header with compact controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-roboto font-normal text-gray-200">
          PnL Calculator
        </h2>
        
        {/* Compact Controls Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Window Pills */}
          <div className="flex gap-1 bg-[#1c202f] border border-[#343a4e] rounded-xl p-1">
            {[1, 7, 30].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  days === value
                    ? "bg-[#343a4e] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {value}d
              </button>
            ))}
          </div>

          {/* Position Size Input */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
              Position
              <span
                className="relative inline-flex"
                onMouseEnter={() => setShowPositionTip(true)}
                onMouseLeave={() => setShowPositionTip(false)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPositionTip((prev) => !prev);
                  }}
                  className="inline-flex"
                  aria-label="Position size info"
                >
                  <Info size={12} className="text-gray-500" />
                </button>
                {showPositionTip && (
                  <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 rounded-lg bg-[#292e40] border border-[#343a4e] text-[11px] shadow-lg z-50">
                    <span className="text-gray-300">Position size, per leg</span>
                    <hr className="border-[#343a4e] my-1.5" />
                    <span className="text-gray-500">Total: ${(parsedPositionSize * 2).toLocaleString()}</span>
                  </span>
                )}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
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
                  const normalized = parsedPositionSize.toLocaleString("en-US", { maximumFractionDigits: 0 });
                  setPositionInput(normalized);
                }}
                className="w-24 pl-5 pr-2 py-1.5 bg-[#1c202f] border border-[#343a4e] rounded-lg text-white text-sm focus:outline-none focus:border-[#4a5568]"
              />
            </div>
          </div>

          {/* Execution Cost Input */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
              Cost
              <span
                className="relative inline-flex"
                onMouseEnter={() => setShowCostTip(true)}
                onMouseLeave={() => setShowCostTip(false)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCostTip((prev) => !prev);
                  }}
                  className="inline-flex"
                  aria-label="Execution cost info"
                >
                  <Info size={12} className="text-gray-500" />
                </button>
                {showCostTip && (
                  <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 p-2 rounded-lg bg-[#292e40] border border-[#343a4e] text-[11px] shadow-lg z-50 whitespace-normal">
                    <span className="text-gray-300">Total execution cost</span>
                    <span className="block text-gray-400">(open + close, both legs)</span>
                    <hr className="border-[#343a4e] my-1.5" />
                    <span className="text-gray-500">Includes slippage + fees.</span>
                  </span>
                )}
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={executionCostInput}
                onChange={(e) => setExecutionCostInput(e.target.value)}
                onBlur={() => {
                  if (!executionCostInput.trim()) {
                    setExecutionCostInput("0.4");
                  }
                }}
                className="w-16 px-2 py-1.5 bg-[#1c202f] border border-[#343a4e] rounded-lg text-white text-sm focus:outline-none focus:border-[#4a5568] appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={0}
                step={0.1}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Performance Summary</h3>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : hasData ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 auto-rows-fr gap-3">
            <StatCard
              icon={TrendingUp}
              iconColor="text-green-400"
              label="Total PnL"
              value={
                <span className={`${pnlCalculations.totalPnL >= 0 ? "text-green-400" : "text-red-400"} text-3xl sm:text-4xl`}>
                  {formatCurrency(pnlCalculations.totalPnL)}
                </span>
              }
              subValue={<span className="text-base">{formatPercent(pnlCalculations.totalPnLPercent)}</span>}
              subValueColor={pnlCalculations.totalPnL >= 0 ? "text-green-400/70" : "text-red-400/70"}
              className="row-span-1 sm:row-span-2 col-span-2 sm:col-span-1 order-1 sm:order-none"
            />
            
            <StatCard
              icon={DollarSign}
              iconColor="text-blue-400"
              label="Avg Daily PnL"
              value={
                <span className={pnlCalculations.avgDailyPnL >= 0 ? "text-green-400" : "text-red-400"}>
                  {formatCurrency(pnlCalculations.avgDailyPnL)}
                </span>
              }
              subValue={formatPercent(pnlCalculations.avgDailyPnLPercent)}
              subValueColor={pnlCalculations.avgDailyPnL >= 0 ? "text-green-400/70" : "text-red-400/70"}
              alignSubValueBottom
              className="order-2 sm:order-none"
            />

            <StatCard
              icon={TrendingUp}
              iconColor="text-emerald-400"
              label="Funding PnL"
              value={
                <span className={pnlCalculations.totalFundingPnL >= 0 ? "text-green-400" : "text-red-400"}>
                  {formatCurrency(pnlCalculations.totalFundingPnL)}
                </span>
              }
              subValue="before costs"
              alignSubValueBottom
              className="order-4 sm:order-none"
            />

            <StatCard
              icon={Percent}
              iconColor="text-cyan-400"
              label="Win Rate"
              value={
                <span className={pnlCalculations.winRate >= 50 ? "text-green-400" : "text-gray-200"}>
                  {pnlCalculations.winRate.toFixed(1)}%
                </span>
              }
              subValue={`${pnlCalculations.winningDays} days`}
              alignSubValueBottom
              className="order-6 sm:order-none"
            />

            <StatCard
              icon={ArrowUpRight}
              iconColor="text-green-400"
              label="Best Day"
              value={
                <span className="text-green-400">
                  {formatCurrency(pnlCalculations.bestDay.pnl)}
                </span>
              }
              subValue={pnlCalculations.bestDay.date ? new Date(pnlCalculations.bestDay.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}
              alignSubValueBottom
              className="order-8 sm:order-none"
            />

            <StatCard
              icon={Layers}
              iconColor="text-indigo-400"
              label="Open Interest"
              value={
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <ExchangeIcon exchange={chartData.longEx} size={14} />
                      {formatExchange(chartData.longEx)}
                    </span>
                    <span className="font-mono text-gray-100">
                      {formatCompactUSD(chartData.longOpenInterest ?? null)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <ExchangeIcon exchange={chartData.shortEx} size={14} />
                      {formatExchange(chartData.shortEx)}
                    </span>
                    <span className="font-mono text-gray-100">
                      {formatCompactUSD(chartData.shortOpenInterest ?? null)}
                    </span>
                  </div>
                </div>
              }
              className="order-10 sm:order-none"
            />

            <StatCard
              icon={Activity}
              iconColor="text-purple-400"
              label="APR"
              value={
                <span className={pnlCalculations.apr >= 0 ? "text-green-400" : "text-red-400"}>
                  {formatPercent(pnlCalculations.apr)}
                </span>
              }
              subValue="annualized"
              alignSubValueBottom
              className="order-3 sm:order-none"
            />

            <StatCard
              icon={Zap}
              iconColor="text-orange-400"
              label="Execution Cost"
              value={
                <span className="text-red-400">
                  -{formatCurrency(pnlCalculations.totalExecutionCost)}
                </span>
              }
              subValue="slippage + fees"
              alignSubValueBottom
              className="order-5 sm:order-none"
            />

            <StatCard
              icon={Clock}
              iconColor="text-yellow-400"
              label="Payback Period"
              value={
                <span className={pnlCalculations.paybackPeriod !== null && pnlCalculations.paybackPeriod <= 7 ? "text-green-400" : "text-gray-200"}>
                  {pnlCalculations.paybackPeriod !== null ? `${pnlCalculations.paybackPeriod.toFixed(1)}d` : "N/A"}
                </span>
              }
              subValue="to breakeven"
              alignSubValueBottom
              className="order-7 sm:order-none"
            />

            <StatCard
              icon={ArrowDownRight}
              iconColor="text-red-400"
              label="Worst Day"
              value={
                <span className="text-red-400">
                  {formatCurrency(pnlCalculations.worstDay.pnl)}
                </span>
              }
              subValue={pnlCalculations.worstDay.date ? new Date(pnlCalculations.worstDay.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}
              alignSubValueBottom
              className="order-9 sm:order-none"
            />

            <StatCard
              icon={BarChart3}
              iconColor="text-blue-400"
              label="Volume 24h"
              value={
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <ExchangeIcon exchange={chartData.longEx} size={14} />
                      {formatExchange(chartData.longEx)}
                    </span>
                    <span className="font-mono text-gray-100">
                      {formatCompactUSD(chartData.longVolume24h ?? null)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <ExchangeIcon exchange={chartData.shortEx} size={14} />
                      {formatExchange(chartData.shortEx)}
                    </span>
                    <span className="font-mono text-gray-100">
                      {formatCompactUSD(chartData.shortVolume24h ?? null)}
                    </span>
                  </div>
                </div>
              }
              className="order-11 sm:order-none"
            />
          </div>
        ) : null}
      </div>

      {/* Chart */}
      <div className="relative border border-[#343a4e] rounded-2xl p-4 bg-[#292e40] h-72">
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
          <div className="absolute inset-0 flex items-center justify-center text-gray-200 bg-[#1c202f]/80 rounded-2xl">
            <p>Loading PnL data...</p>
          </div>
        )}

        {err && (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 bg-red-950/40 rounded-2xl">
            <p>{err}</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      {hasData && (
        <div className="mt-3 text-center text-xs text-gray-500">
          Calculated from historical funding data. Not a guarantee of future performance.
        </div>
      )}
    </div>
  );
}
