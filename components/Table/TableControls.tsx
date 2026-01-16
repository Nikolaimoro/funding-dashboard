"use client";

import ExchangeFilter from "@/components/Table/ExchangeFilter";
import MinimumFilter from "@/components/Table/MinimumFilter";

interface TableControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  exchanges: string[];
  selectedExchanges: string[];
  onToggleExchange: (exchange: string) => void;
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
      <input
        className={inputClassName}
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <ExchangeFilter
        exchanges={exchanges}
        selectedExchanges={selectedExchanges}
        onToggleExchange={onToggleExchange}
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
