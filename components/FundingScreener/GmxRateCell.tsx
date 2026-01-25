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
  preferredSide?: "long" | "short";
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
  preferredSide,
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

  const optionsByQuote = options.reduce((map, option) => {
    const entry = map.get(option.quote) ?? { long: null, short: null };
    if (option.side === "long") entry.long = option;
    if (option.side === "short") entry.short = option;
    map.set(option.quote, entry);
    return map;
  }, new Map<string, { long: GmxOption | null; short: GmxOption | null }>());

  const getPreferredForQuote = (quote: string) => {
    const group = optionsByQuote.get(quote);
    if (!group) return null;
    if (preferredSide) {
      return group[preferredSide] ?? group.short ?? group.long ?? null;
    }
    if (selected.quote === quote && selected.side) return selected;
    return group.short ?? group.long ?? null;
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
              Other Markets
            </div>
            <div className="space-y-1">
              {Array.from(optionsByQuote.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([quote, group]) => {
                  const preferred = getPreferredForQuote(quote);
                  if (!preferred) return null;
                  const isActive = selected.quote === quote;
                  return (
                    <div
                      key={quote}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectKey(preferred.columnKey)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectKey(preferred.columnKey);
                        }
                      }}
                      className={`w-full rounded-lg px-2 py-1 text-left transition-colors duration-200 ${
                        isActive ? "bg-[#1f2434]" : "hover:bg-[#23283a]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-gray-300">
                        <span className="inline-flex items-center gap-2">
                          <span className="text-gray-100">{quote}</span>
                          {preferred.side && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                preferred.side === "long"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-red-500/20 text-red-300"
                              }`}
                            >
                              {preferred.side === "long" ? "LONG" : "SHORT"}
                            </span>
                          )}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="font-mono text-gray-100">
                            {formatAPR(preferred.rate)}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-gray-500">
                        <span>
                          OI {formatCompactUSD(preferred.market.open_interest)}
                        </span>
                        <span>Vol {formatCompactUSD(preferred.market.volume_24h)}</span>
                      </div>
                    </div>
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
      className="inline-flex items-center justify-end"
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

      {tooltip}
    </div>
  );
}
