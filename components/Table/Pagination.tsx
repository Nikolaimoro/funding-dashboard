/**
 * Shared pagination controls with row limit selector
 * Used in FundingTable, ArbitrageTable
 */

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { TAILWIND } from "@/lib/theme";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  showPagination: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  limit,
  onPageChange,
  onLimitChange,
  showPagination,
}: PaginationProps) {
  return (
    <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
      <div className="flex items-center gap-3">
        <span className="text-white/50 font-light">Items per page</span>
        <div className="relative">
          <select
            className="appearance-none bg-transparent border border-[#343a4e] rounded-lg pl-2 pr-6 py-1 text-gray-200 focus:outline-none"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={-1}>All</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {showPagination && totalPages > 1 && (
        <div className="flex gap-3 items-center">
          <span className="px-2 min-w-[64px] text-center tabular-nums text-white/50 font-light">
            {currentPage + 1} of {totalPages}
          </span>

          <button
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="h-8 w-8 rounded-md flex items-center justify-center text-gray-300 transition-colors hover:bg-[#383d50] disabled:opacity-40"
            type="button"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage + 1 >= totalPages}
            className="h-8 w-8 rounded-md flex items-center justify-center text-gray-300 transition-colors hover:bg-[#383d50] disabled:opacity-40"
            type="button"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
