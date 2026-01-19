"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatAPR, formatExchange } from "@/lib/formatters";
import { ArbPair } from "@/lib/funding";
import ExchangeIcon from "@/components/ui/ExchangeIcon";

interface APRCellProps {
  maxArb: number | null;
  arbPair: ArbPair | null;
}

export default function APRCell({ maxArb, arbPair }: APRCellProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const rateColor =
    maxArb !== null && maxArb > 0 ? "text-emerald-400" : "text-gray-500";

  if (maxArb === null) {
    return <span className="text-gray-500">–</span>;
  }

  const updateTooltipPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  const tooltip =
    showTooltip && tooltipPos && arbPair && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed z-[100] w-44 p-2 rounded-lg bg-[#292e40] border border-[#343a4e] shadow-xl text-xs text-left pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="flex justify-between items-center text-gray-400 mb-1">
              <span>Long</span>
              <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                <ExchangeIcon exchange={arbPair.longMarket.exchange} size={14} />
                {formatExchange(arbPair.longMarket.exchange)}
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>Short</span>
              <span className="text-red-400 font-medium inline-flex items-center gap-1">
                <ExchangeIcon exchange={arbPair.shortMarket.exchange} size={14} />
                {formatExchange(arbPair.shortMarket.exchange)}
              </span>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#343a4e]" />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <span
        ref={triggerRef}
        className={`${rateColor} relative cursor-default`}
        onMouseEnter={() => {
          updateTooltipPosition();
          setShowTooltip(true);
        }}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {formatAPR(maxArb)}
      </span>
      {tooltip}
    </>
  );
}
