"use client";

import { formatAPR } from "@/lib/formatters";
import { isValidUrl } from "@/lib/validation";
import { FundingMatrixMarket } from "@/lib/types";

interface RateCellProps {
  market: FundingMatrixMarket;
  rate: number | null;
}

export default function RateCell({ market, rate }: RateCellProps) {
  const rateText = rate !== null ? formatAPR(rate) : "–";

  const rateColor =
    rate === null
      ? "text-gray-600"
      : rate > 0
      ? "text-emerald-400"
      : rate < 0
      ? "text-red-400"
      : "text-gray-400";

  const content = <span className={rateColor}>{rateText}</span>;

  if (isValidUrl(market.ref_url)) {
    return (
      <a
        href={market.ref_url!}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        {content}
      </a>
    );
  }

  return content;
}
