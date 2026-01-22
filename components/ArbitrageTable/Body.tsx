"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Info } from "lucide-react";
import { formatCompactUSD, formatAPR, formatExchange } from "@/lib/formatters";
import { TAILWIND } from "@/lib/theme";
import { ArbRow, SortDir } from "@/lib/types";
import ExchangeIcon from "@/components/ui/ExchangeIcon";

type SortKey = "apr_spread" | "stability";

/**
 * APR cell with tooltip showing long/short exchanges
 * Clicking opens the backtester with pre-filled parameters
 */
function APRCellWithTooltip({ 
  row, 
  children 
}: { 
  row: ArbRow; 
  children: React.ReactNode;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);

  const updateTooltipPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  // Build backtester URL with parameters
  const backtesterUrl = (() => {
    const longExchange = row.long_exchange?.toLowerCase() || "";
    const shortExchange = row.short_exchange?.toLowerCase() || "";
    const longQuote = row.long_quote?.toLowerCase() || "usdt";
    const shortQuote = row.short_quote?.toLowerCase() || "usdt";
    const exchange1 = `${longExchange}${longQuote}`;
    const exchange2 = `${shortExchange}${shortQuote}`;
    return `/backtester?token=${encodeURIComponent(row.base_asset)}&exchange1=${encodeURIComponent(exchange1)}&exchange2=${encodeURIComponent(exchange2)}`;
  })();

  const tooltip =
    showTooltip && tooltipPos && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed z-[100] w-44 p-2 rounded-lg bg-[#292e40] border border-[#343a4e] shadow-xl text-xs text-left pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="text-xs text-white">View historical chart</div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#343a4e]" />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <a
        ref={triggerRef}
        href={backtesterUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="cursor-pointer"
        onMouseEnter={() => {
          updateTooltipPosition();
          setShowTooltip(true);
        }}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
      </a>
      {tooltip}
    </>
  );
}

/**
 * Stability progress bar component
 * Shows a horizontal bar with fill based on stability value (0-1)
 * Color coded: green (0.8-1), orange (0.5-0.8), red (<0.5)
 */
function StabilityBar({ value }: { value: number | null }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  if (value == null) {
    return <span className="text-gray-500">–</span>;
  }
  
  const percentage = Math.min(Math.max(value * 100, 0), 100);
  const colorClass = value >= 0.8 
    ? "bg-emerald-400 border-emerald-400" 
    : value >= 0.5 
      ? "bg-orange-400 border-orange-400" 
      : "bg-red-400 border-red-400";
  const label = value >= 0.8 ? "High" : value >= 0.5 ? "Medium" : "low";
  
  return (
    <div className="flex items-center justify-center w-full">
      <div
        ref={barRef}
        onMouseEnter={() => {
          if (!barRef.current) return;
          const rect = barRef.current.getBoundingClientRect();
          setTooltipPos({
            top: rect.top,
            left: rect.left + rect.width / 2,
          });
          setShowTooltip(true);
        }}
        onMouseLeave={() => setShowTooltip(false)}
        className={`relative w-16 h-2 rounded-full border ${colorClass.split(' ')[1]} bg-transparent`}
      >
        <div 
          className={`absolute left-0 top-0 h-full rounded-full ${colorClass.split(' ')[0]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showTooltip && tooltipPos && typeof window !== "undefined" &&
        createPortal(
          <div
            style={{ top: tooltipPos.top - 8, left: tooltipPos.left }}
            className="fixed z-[9999] px-2 py-1 rounded-lg bg-[#292e40] border border-[#343a4e] text-xs text-gray-200 shadow-lg pointer-events-none -translate-x-1/2 -translate-y-full"
          >
            {label}
          </div>,
          document.body
        )}
    </div>
  );
}

/**
 * Info tooltip component for Stability header
 */
function StabilityInfo() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTooltip) return;
    
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        tooltipRef.current && 
        !tooltipRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setShowTooltip(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTooltip]);

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setTooltipPos({
      top: rect.top + rect.height / 2,
      left: rect.left - 8,
    });
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showTooltip && buttonRef.current) {
      updatePosition();
      setShowTooltip(true);
      return;
    }
    setShowTooltip(false);
  };

  useEffect(() => {
    if (!showTooltip) return;
    const handleUpdate = () => updatePosition();
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);
    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [showTooltip]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
        aria-label="Stability info"
      >
        <Info size={14} />
      </button>
      {showTooltip && tooltipPos && typeof window !== "undefined" &&
        createPortal(
          <div 
            ref={tooltipRef}
            style={{ top: tooltipPos.top, left: tooltipPos.left, transform: "translate(-100%, -50%)" }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[9999] w-64 sm:w-80 p-3 rounded-lg bg-[#292e40] border border-[#343a4e] shadow-xl text-xs text-gray-300 leading-relaxed text-left animate-tooltip-zoom pointer-events-auto"
          >
            <p className="text-left">Indicates how consistent and reliable the funding spread has been over time.</p>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-[#343a4e]" />
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * Info tooltip component for APR header
 */
function AprInfo() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [tooltipShiftX, setTooltipShiftX] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTooltip) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setShowTooltip(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTooltip]);

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setTooltipPos({
      top: rect.top,
      left: rect.left + rect.width / 2,
    });
    setTooltipShiftX(0);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showTooltip && buttonRef.current) {
      updatePosition();
      setShowTooltip(true);
      return;
    }
    setShowTooltip(false);
  };

  useEffect(() => {
    if (!showTooltip) return;
    const handleUpdate = () => updatePosition();
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);
    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [showTooltip]);

  useEffect(() => {
    if (!showTooltip || !tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    let shift = 0;
    if (rect.left < 8) {
      shift = 8 - rect.left;
    } else if (rect.right > viewportWidth - 8) {
      shift = (viewportWidth - 8) - rect.right;
    }
    if (shift !== tooltipShiftX) {
      setTooltipShiftX(shift);
    }
  }, [showTooltip, tooltipShiftX]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
        aria-label="APR info"
      >
        <Info size={14} />
      </button>
      {showTooltip && tooltipPos && typeof window !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              transform: `translate(-50%, calc(-100% - 8px)) translateX(${tooltipShiftX}px)`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[9999] w-64 sm:w-80 max-w-[calc(100vw-32px)] p-3 rounded-lg bg-[#292e40] border border-[#343a4e] shadow-xl text-xs text-gray-300 leading-relaxed text-left animate-tooltip-zoom pointer-events-auto"
          >
            <p className="text-left">Estimated APR based on historical funding data over the last 15 days.</p>
            <div
              style={{ left: `calc(50% - ${tooltipShiftX}px)` }}
              className="absolute bottom-0 translate-y-full -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#343a4e]"
            />
          </div>,
          document.body
        )}
    </>
  );
}

interface LongButtonProps {
  href: string | null;
  label: string;
  exchange: string;
}

function LongButton({ href, label, exchange }: LongButtonProps) {
  if (!href) return <span className="text-gray-600">–</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] sm:px-3 sm:py-1 sm:text-sm font-medium
        -translate-x-0.5 sm:translate-x-0
        text-green-400
        border border-green-500/30
        hover:border-green-500/60 transition
        whitespace-nowrap
      "
    >
      <ExchangeIcon exchange={exchange} size={16} />
      {label}
    </a>
  );
}

interface ShortButtonProps {
  href: string | null;
  label: string;
  exchange: string;
}

function ShortButton({ href, label, exchange }: ShortButtonProps) {
  if (!href) return <span className="text-gray-600">–</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] sm:px-3 sm:py-1 sm:text-sm font-medium
        -translate-x-0.5 sm:translate-x-0
        text-red-400
        border border-red-500/30
        hover:border-red-500/60 transition
        whitespace-nowrap
      "
    >
      <ExchangeIcon exchange={exchange} size={16} />
      {label}
    </a>
  );
}

interface ArbitrageTableBodyProps {
  rows: ArbRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onRowClick?: (row: ArbRow) => void;
  loading?: boolean;
}

/**
 * Arbitrage table body component
 * Displays headers and data rows with sorting controls
 */
export default function ArbitrageTableBody({
  rows,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  loading = false,
}: ArbitrageTableBodyProps) {
  const formatAPRNode = (v: number | null) => {
    const text = formatAPR(v);
    if (text === "–") {
      return (
        <span className="text-white font-mono tabular-nums inline-flex w-full justify-center">
          –
        </span>
      );
    }
    const numeric = text.slice(0, -1);
    return (
      <span className="text-white font-mono tabular-nums inline-flex w-full items-baseline justify-center">
        <span>{numeric}</span>
        <span className="opacity-70">%</span>
      </span>
    );
  };

  return (
    <div className="overflow-auto">
      <table className="w-full text-base table-fixed min-w-[900px] whitespace-nowrap">
        <colgroup>
          <col className="w-[10%] min-w-[90px]" />
          <col className="w-[8%] min-w-[70px]" />
          <col className="w-[16%] min-w-[130px]" />
          <col className="w-[16%] min-w-[130px]" />
          <col className="w-[12%] min-w-[110px]" />
          <col className="w-[12%] min-w-[110px]" />
          <col className="w-[12%] min-w-[110px]" />
          <col className="w-[6%] min-w-[50px]" />
        </colgroup>
        <thead className="sticky top-0 z-10 text-[13px] bg-[#292e40]">
          <tr className="border-b border-[#343a4e]">
            <th className={TAILWIND.table.header}>
              <span className="inline-flex items-center gap-1 text-left select-none text-gray-400">
                Asset
              </span>
            </th>

            <th className={`${TAILWIND.table.header} text-center pl-12 sm:pl-4`}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSort("apr_spread")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSort("apr_spread");
                  }
                }}
                className="inline-flex items-center justify-center gap-1 w-full select-none cursor-pointer"
              >
                <span className="text-gray-400">APR</span>
                <AprInfo />
                <span className="flex flex-col items-center leading-[0.7]">
                  <span
                    className={`text-[11px] inline-block origin-center scale-y-[0.6] ${sortKey === "apr_spread" && sortDir === "asc" ? "text-gray-200" : "text-gray-500/70"}`}
                  >
                    ▲
                  </span>
                  <span
                    className={`text-[11px] inline-block origin-center scale-y-[0.6] ${sortKey === "apr_spread" && sortDir === "desc" ? "text-gray-200" : "text-gray-500/70"}`}
                  >
                    ▼
                  </span>
                </span>
              </div>
            </th>

            <th className={`${TAILWIND.table.header} pl-24`}>
              <span className="inline-flex items-center gap-1 text-left select-none text-gray-400">
                Long
              </span>
            </th>
            <th className={TAILWIND.table.header}>
              <span className="inline-flex items-center gap-1 text-left select-none text-gray-400">
                Short
              </span>
            </th>
            <th className={`${TAILWIND.table.header} text-left sm:text-center pl-0 sm:pl-4 -ml-2 sm:ml-0`}>
              <span className="inline-flex items-center gap-1 justify-start sm:justify-center w-full select-none text-gray-400">
                Open Interest
              </span>
            </th>
            <th className={`${TAILWIND.table.header} text-center`}>
              <span className="inline-flex items-center gap-1 justify-center w-full select-none text-gray-400">
                Volume 24h
              </span>
            </th>

            <th className={`${TAILWIND.table.header} text-center`}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSort("stability")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSort("stability");
                  }
                }}
                className="inline-flex items-center justify-center gap-1 w-full select-none cursor-pointer"
              >
                <span className="text-gray-400">Stability</span>
                <StabilityInfo />
                <span className="flex flex-col items-center leading-[0.7]">
                  <span
                    className={`text-[11px] inline-block origin-center scale-y-[0.6] ${sortKey === "stability" && sortDir === "asc" ? "text-gray-200" : "text-gray-500/70"}`}
                  >
                    ▲
                  </span>
                  <span
                    className={`text-[11px] inline-block origin-center scale-y-[0.6] ${sortKey === "stability" && sortDir === "desc" ? "text-gray-200" : "text-gray-500/70"}`}
                  >
                    ▼
                  </span>
                </span>
              </div>
            </th>

            <th className={`${TAILWIND.table.header} text-center`}></th>
          </tr>
        </thead>

        <tbody>
          {!loading &&
            rows.map((r) => (
              <tr
                key={`${r.base_asset}-${r.long_market_id}-${r.short_market_id}`}
                onClick={() => onRowClick?.(r)}
                className={`${TAILWIND.table.row} ${TAILWIND.bg.hover} cursor-pointer transition-colors`}
              >
                <td className="px-4 py-4 font-mono font-semibold text-white">
                  {r.base_asset}
                </td>

                <td className="py-4 pr-4 pl-12 sm:pl-4 text-center">
                  <APRCellWithTooltip row={r}>
                    <span className="inline-flex w-full justify-center">
                      {formatAPRNode(r.apr_spread)}
                    </span>
                  </APRCellWithTooltip>
                </td>

                <td className="px-4 py-4 pl-24">
                  <LongButton
                    href={r.long_url}
                    label={formatExchange(r.long_exchange)}
                    exchange={r.long_exchange}
                  />
                </td>

                <td className="px-4 py-4">
                  <ShortButton
                    href={r.short_url}
                    label={formatExchange(r.short_exchange)}
                    exchange={r.short_exchange}
                  />
                </td>

                <td className="py-4 pr-4 pl-0 sm:pl-4 -ml-6 sm:ml-0 text-left sm:text-center">
                  <span className="inline-flex w-full justify-start sm:justify-center font-mono tabular-nums text-[14px] sm:text-base text-white">
                    <span>{formatCompactUSD(r.long_open_interest)}</span>
                    <span className="text-gray-500 px-1">/</span>
                    <span>{formatCompactUSD(r.short_open_interest)}</span>
                  </span>
                </td>

                <td className="px-4 py-4 text-center">
                  <span className="inline-flex w-full justify-center font-mono tabular-nums text-[14px] sm:text-base text-white">
                    <span>{formatCompactUSD(r.long_volume_24h)}</span>
                    <span className="text-gray-500 px-1">/</span>
                    <span>{formatCompactUSD(r.short_volume_24h)}</span>
                  </span>
                </td>

                <td className="px-4 py-4 text-center">
                  <span className="inline-flex w-full justify-center">
                    <StabilityBar value={r.stability} />
                  </span>
                </td>

                <td className="px-4 py-4 text-center text-gray-500">
                  <span className="inline-flex w-full justify-center">
                    <ExternalLink size={16} />
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
