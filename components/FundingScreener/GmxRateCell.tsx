"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatAPR, formatCompactUSD, formatExchange } from "@/lib/formatters";
import { isValidUrl } from "@/lib/validation";
import ExchangeIcon from "@/components/ui/ExchangeIcon";
import { FundingMatrixMarket } from "@/lib/types";

type GmxOption = {
  columnKey: string;
  quote: string;
  side: "long" | "short" | null;
  market: FundingMatrixMarket;
  rate: number | null;
};

interface GmxRateCellProps {
  options: GmxOption[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
  token?: string | null;
  role?: "long" | "short";
}

function RoleIndicator({ role }: { role: "long" | "short" }) {
  if (role === "long") {
    return (
      <span
        className="inline-block ml-1 w-0 h-0 align-middle"
        style={{
          borderLeft: "3px solid transparent",
          borderRight: "3px solid transparent",
          borderBottom: "5px solid #34d399",
        }}
        title="Long position (min rate)"
      />
    );
  }
  return (
    <span
      className="inline-block ml-1 w-0 h-0 align-middle"
      style={{
        borderLeft: "3px solid transparent",
        borderRight: "3px solid transparent",
        borderTop: "5px solid #f87171",
      }}
      title="Short position (max rate)"
    />
  );
}

export default function GmxRateCell({
  options,
  selectedKey,
  onSelectKey,
  token,
  role,
}: GmxRateCellProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

  const selected = options.find((opt) => opt.columnKey === selectedKey) ?? options[0];
  if (!selected) {
    return <span className="text-gray-600 block text-center">–</span>;
  }

  const rate = selected.rate;
  const rateText = rate !== null ? formatAPR(rate) : "–";
  const rateColor =
    rate === null
      ? "text-gray-600"
      : rate < 0
      ? "text-emerald-400"
      : rate > 0
      ? "text-red-400"
      : "text-gray-400";

  const hasOppositeSide =
    !!selected.side &&
    options.some(
      (opt) => opt.quote === selected.quote && opt.side && opt.side !== selected.side
    );

  const toggleSide = hasOppositeSide ? (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        const next = options.find(
          (opt) => opt.quote === selected.quote && opt.side && opt.side !== selected.side
        );
        if (next) onSelectKey(next.columnKey);
      }}
      className="relative inline-flex h-4 w-8 items-center rounded-full border border-[#343a4e] bg-[#23283a] p-0.5 text-[9px] font-medium text-gray-400"
      title={selected.side === "long" ? "Long rates" : "Short rates"}
    >
      <span className="relative z-10 grid w-full grid-cols-2">
        <span
          className={`text-center transition-colors ${
            selected.side === "long" ? "text-emerald-200" : "text-gray-400"
          }`}
        >
          L
        </span>
        <span
          className={`text-center transition-colors ${
            selected.side === "short" ? "text-red-200" : "text-gray-400"
          }`}
        >
          S
        </span>
      </span>
      <span
        className={`absolute left-0.5 top-1/2 h-3 w-[calc(50%-2px)] -translate-y-1/2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          selected.side === "long"
            ? "translate-x-0 bg-emerald-500/25"
            : "translate-x-full bg-red-500/25"
        }`}
      />
    </button>
  ) : null;

  const handleToggleSide = () => {
    if (!selected.side) return;
    const next = options.find(
      (opt) => opt.quote === selected.quote && opt.side && opt.side !== selected.side
    );
    if (next) onSelectKey(next.columnKey);
  };

  const updateTooltipPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  const openTooltip = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    updateTooltipPosition();
    setShowTooltip(true);
  };

  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setShowTooltip(false);
    }, 160);
  };

  const tooltip =
    showTooltip && tooltipPos && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed z-[110] w-64 rounded-xl border border-[#343a4e] bg-[#292e40] p-3 text-xs shadow-xl text-left pointer-events-auto -translate-x-1/2 -translate-y-full"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
            onMouseEnter={openTooltip}
            onMouseLeave={scheduleClose}
          >
            <div className="flex items-center gap-2 text-white font-medium mb-2">
              <ExchangeIcon exchange={selected.market.exchange} size={14} />
              {formatExchange(selected.market.exchange)}
              {token ? <span className="text-gray-400">· {token}</span> : null}
            </div>

            <div className="text-[10px] uppercase text-gray-500 mb-2">
              Other markets
            </div>
            <div className="space-y-1">
              {options.map((opt) => {
                const isActive = opt.columnKey === selected.columnKey;
                return (
                  <button
                    key={opt.columnKey}
                    type="button"
                    onClick={() => onSelectKey(opt.columnKey)}
                    className={`w-full rounded-lg px-2 py-1 text-left transition-colors duration-200 ${
                      isActive ? "bg-[#1f2434]" : "hover:bg-[#23283a]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-gray-300">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-gray-100">{opt.quote}</span>
                        {opt.side && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              opt.side === "long"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            {opt.side === "long" ? "LONG" : "SHORT"}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-gray-100">
                        {formatAPR(opt.rate)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-gray-500">
                      <span>OI {formatCompactUSD(opt.market.open_interest)}</span>
                      <span>Vol {formatCompactUSD(opt.market.volume_24h)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {isValidUrl(selected.market.ref_url) && (
              <div className="mt-2 pt-2 border-t border-[#343a4e] text-[10px] text-gray-500">
                Click to open GMX in a new tab
              </div>
            )}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#343a4e]" />
          </div>,
          document.body
        )
      : null;

  const rateNode = (
    <span className={`${rateColor} inline-flex items-center`}>
      {rateText}
      {role && <RoleIndicator role={role} />}
    </span>
  );

  return (
    <div
      ref={triggerRef}
      className="inline-flex items-center gap-1.5"
      onMouseEnter={openTooltip}
      onMouseLeave={scheduleClose}
    >
      {isValidUrl(selected.market.ref_url) ? (
        <a
          href={selected.market.ref_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center"
          onMouseEnter={openTooltip}
          onMouseLeave={scheduleClose}
        >
          {rateNode}
        </a>
      ) : (
        rateNode
      )}

      {toggleSide}
      {tooltip}
    </div>
  );
}
