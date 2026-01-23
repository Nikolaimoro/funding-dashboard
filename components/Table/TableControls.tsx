"use client";

import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import ExchangeFilter from "@/components/Table/ExchangeFilter";
import MinimumFilter from "@/components/Table/MinimumFilter";

interface TableControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  exchanges: string[];
  selectedExchanges: string[];
  onToggleExchange: (exchange: string) => void;
  onCheckAllExchanges: () => void;
  onUncheckAllExchanges: () => void;
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  exchangeHeaderExtras?: ReactNode;
  renderExchangeActions?: (exchange: string) => ReactNode;
  minOI: number | "";
  onMinOIChange: (value: number | "") => void;
  minVolume: number | "";
  onMinVolumeChange: (value: number | "") => void;
  maxOI: number;
  maxVolume: number;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  searchPlaceholder: string;
  inputClassName: string;
  className?: string;
}

export default function TableControls({
  search,
  onSearchChange,
  exchanges,
  selectedExchanges,
  onToggleExchange,
  onCheckAllExchanges,
  onUncheckAllExchanges,
  filterOpen,
  onFilterOpenChange,
  exchangeHeaderExtras,
  renderExchangeActions,
  minOI,
  onMinOIChange,
  minVolume,
  onMinVolumeChange,
  maxOI,
  maxVolume,
  filtersOpen,
  onFiltersOpenChange,
  searchPlaceholder,
  inputClassName,
  className,
}: TableControlsProps) {
  return (
    <div className={`flex flex-wrap gap-3 items-center ${className ?? ""}`}>
      <MinimumFilter
        minOI={minOI}
        minVolume={minVolume}
        onMinOIChange={onMinOIChange}
        onMinVolumeChange={onMinVolumeChange}
        maxOI={maxOI}
        maxVolume={maxVolume}
        open={filtersOpen}
        onOpenChange={onFiltersOpenChange}
      />

      <ExchangeFilter
        exchanges={exchanges}
        selectedExchanges={selectedExchanges}
        onToggleExchange={onToggleExchange}
        onCheckAll={onCheckAllExchanges}
        onUncheckAll={onUncheckAllExchanges}
        open={filterOpen}
        onOpenChange={onFilterOpenChange}
        headerExtras={exchangeHeaderExtras}
        renderExchangeActions={renderExchangeActions}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white w-4 h-4" />
        <input
          className={`${inputClassName} pl-10 pr-9 bg-transparent border border-[#383d50] focus:bg-transparent focus:border-[#383d50]`}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-[#383d50] border border-[#343a4e] text-gray-300 text-xs leading-none flex items-center justify-center transition-colors duration-200 hover:border-white hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
