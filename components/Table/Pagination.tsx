/**
 * Shared pagination controls with row limit selector
 * Used in FundingTable, ArbitrageTable
 */

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
      <div>
        Rows:
        <select
          className="ml-2 bg-gray-800 border border-gray-700 rounded px-2 py-1"
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
        >
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={-1}>All</option>
        </select>
      </div>

      {showPagination && totalPages > 1 && (
        <div className="flex gap-2 items-center">
          <button
            onClick={() => onPageChange(0)}
            disabled={currentPage === 0}
            className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
            type="button"
          >
            First
          </button>

          <button
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
            type="button"
          >
            Prev
          </button>

          <span className="px-2 min-w-[64px] text-center tabular-nums text-gray-300">
            {currentPage + 1} / {totalPages}
          </span>

          <button
            onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage + 1 >= totalPages}
            className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
            type="button"
          >
            Next
          </button>

          <button
            onClick={() => onPageChange(totalPages - 1)}
            disabled={currentPage + 1 >= totalPages}
            className="border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40"
            type="button"
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
}
