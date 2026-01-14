"use client";

import { TAILWIND } from "@/lib/theme";
import ExchangeFilter from "@/components/Table/ExchangeFilter";
import MinimumFilter from "@/components/Table/MinimumFilter";

interface FundingTableControlsProps {
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
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
}

/**
 * Search and filter controls for Funding Table
 * Includes search input, exchange filter, and min OI/Volume filter
 */
export default function FundingTableControls({
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
  filtersOpen,
  onFiltersOpenChange,
}: FundingTableControlsProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4 items-center">
      <input
        className={TAILWIND.input.default}
        placeholder="Search market"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
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
        open={filtersOpen}
        onOpenChange={onFiltersOpenChange}
      />
    </div>
  );
}
