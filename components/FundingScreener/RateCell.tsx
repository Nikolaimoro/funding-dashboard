"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatAPR, formatCompactUSD, formatExchange } from "@/lib/formatters";
import { isValidUrl } from "@/lib/validation";
import { FundingMatrixMarket } from "@/lib/types";

interface RateCellProps {
  market: FundingMatrixMarket;
  rate: number | null;
  token?: string;
}

export default function RateCell({ market, rate, token }: RateCellProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const rateText = rate !== null ? formatAPR(rate) : "–";

  const rateColor =
    rate === null
      ? "text-gray-600"
      : rate > 0
      ? "text-emerald-400"
      : rate < 0
      ? "text-red-400"
      : "text-gray-400";

  const exchangeName = formatExchange(market.exchange);
  const displayToken = token ?? "";

  const updateTooltipPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  const content = (
    <span
      ref={triggerRef}
      className={`${rateColor} relative cursor-pointer`}
      onMouseEnter={() => {
        updateTooltipPosition();
        setShowTooltip(true);
      }}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {rateText}
    </span>
  );

  const tooltip =
    showTooltip && tooltipPos && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed z-[100] w-44 p-2 rounded-lg bg-[#292e40] border border-[#343a4e] shadow-xl text-xs text-left pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="font-medium text-white mb-1">
              {exchangeName}{displayToken ? ` · ${displayToken}` : ""}
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Open Interest</span>
              <span className="text-gray-200">{formatCompactUSD(market.open_interest)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Volume 24h</span>
              <span className="text-gray-200">{formatCompactUSD(market.volume_24h)}</span>
            </div>
            {isValidUrl(market.ref_url) && (
              <div className="mt-1.5 pt-1.5 border-t border-[#343a4e] text-gray-500 text-[10px]">
                Click to open {exchangeName} in a new tab
              </div>
            )}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#343a4e]" />
          </div>,
          document.body
        )
      : null;

  if (isValidUrl(market.ref_url)) {
    return (
      <a
        href={market.ref_url!}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
        onMouseEnter={() => {
          updateTooltipPosition();
          setShowTooltip(true);
        }}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {content}
        {tooltip}
      </a>
    );
  }

  return (
    <>
      {content}
      {tooltip}
    </>
  );
}
