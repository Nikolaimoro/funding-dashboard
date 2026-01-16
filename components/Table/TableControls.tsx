"use client";

import { Search } from "lucide-react";
import ExchangeFilter from "@/components/Table/ExchangeFilter";
import MinimumFilter from "@/components/Table/MinimumFilter";

interface TableControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  exchanges: string[];
  selectedExchanges: string[];
  onToggleExchange: (exchange: string) => void;
  onResetExchanges: () => void;
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
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
}

export default function TableControls({
  search,
  onSearchChange,
  exchanges,
  selectedExchanges,
  onToggleExchange,
  onResetExchanges,
  filterOpen,
  onFilterOpenChange,
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
}: TableControlsProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4 items-center">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white w-4 h-4" />
        <input
          className={`${inputClassName} pl-10`}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <ExchangeFilter
        exchanges={exchanges}
        selectedExchanges={selectedExchanges}
        onToggleExchange={onToggleExchange}
        onResetExchanges={onResetExchanges}
        open={filterOpen}
        onOpenChange={onFilterOpenChange}
      />

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
    </div>
  );
}
