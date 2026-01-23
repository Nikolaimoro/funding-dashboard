"use client";

import { ChevronDown } from "lucide-react";
import { SortDir } from "@/lib/types";
import { TAILWIND } from "@/lib/theme";

type SortKey =
  | "exchange"
  | "market"
  | "funding_rate_now"
  | "open_interest"
  | "volume_24h"
  | "1d"
  | "3d"
  | "7d"
  | "15d"
  | "30d";

type SortOption = {
  key: SortKey;
  dir: SortDir;
  label: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSelect: (key: SortKey, dir: SortDir) => void;
  className?: string;
};

const options: SortOption[] = [
  { key: "exchange", dir: "asc", label: "Exchange A-Z" },
  { key: "exchange", dir: "desc", label: "Exchange Z-A" },
  { key: "market", dir: "asc", label: "Market A-Z" },
  { key: "market", dir: "desc", label: "Market Z-A" },
  { key: "open_interest", dir: "desc", label: "Open Interest High" },
  { key: "open_interest", dir: "asc", label: "Open Interest Low" },
  { key: "volume_24h", dir: "desc", label: "Volume 24h High" },
  { key: "volume_24h", dir: "asc", label: "Volume 24h Low" },
  { key: "funding_rate_now", dir: "desc", label: "Now High" },
  { key: "funding_rate_now", dir: "asc", label: "Now Low" },
  { key: "1d", dir: "desc", label: "1d High" },
  { key: "1d", dir: "asc", label: "1d Low" },
  { key: "3d", dir: "desc", label: "3d High" },
  { key: "3d", dir: "asc", label: "3d Low" },
  { key: "7d", dir: "desc", label: "7d High" },
  { key: "7d", dir: "asc", label: "7d Low" },
  { key: "15d", dir: "desc", label: "15d High" },
  { key: "15d", dir: "asc", label: "15d Low" },
  { key: "30d", dir: "desc", label: "30d High" },
  { key: "30d", dir: "asc", label: "30d Low" },
];

const getSortLabel = (key: SortKey, dir: SortDir) => {
  const found = options.find(
    (option) => option.key === key && option.dir === dir
  );
  return found ? found.label : "Sort";
};

export default function FundingMobileSort({
  open,
  onOpenChange,
  sortKey,
  sortDir,
  onSelect,
  className,
}: Props) {
  return (
    <div className={`relative min-[960px]:hidden ${className ?? ""}`}>
      <button
        onClick={() => onOpenChange(!open)}
        className={`${TAILWIND.button.secondary} inline-flex items-center gap-2 text-sm`}
        type="button"
      >
        <span>Sort by: {getSortLabel(sortKey, sortDir)}</span>
        <ChevronDown className="h-4 w-4 text-gray-300" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute z-50 mt-2 bg-[#292e40] border border-[#343a4e] rounded-lg left-0 w-[min(280px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[70vh] overflow-hidden shadow-lg animate-tooltip-zoom p-2">
            <div className="grid gap-1 max-h-[64vh] overflow-y-auto pr-1">
              {options.map((option) => {
                const isActive =
                  option.key === sortKey && option.dir === sortDir;
                return (
                  <button
                    key={`${option.key}-${option.dir}`}
                    type="button"
                    onClick={() => {
                      onSelect(option.key, option.dir);
                      onOpenChange(false);
                    }}
                    className={[
                      "w-full text-left rounded-md px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-[#353b52] text-white"
                        : "text-gray-200 hover:bg-[#353b52]",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
