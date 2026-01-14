/**
 * Shared minimum threshold filter for OI and Volume
 * Used in FundingTable, ArbitrageTable
 */

interface MinimumFilterProps {
  minOI: number | "";
  minVolume: number | "";
  onMinOIChange: (value: number | "") => void;
  onMinVolumeChange: (value: number | "") => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MinimumFilter({
  minOI,
  minVolume,
  onMinOIChange,
  onMinVolumeChange,
  open,
  onOpenChange,
}: MinimumFilterProps) {
  const activeFilters =
    (typeof minOI === "number" && minOI > 0 ? 1 : 0) +
    (typeof minVolume === "number" && minVolume > 0 ? 1 : 0);

  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className="bg-gray-800 border border-gray-700 px-3 py-2 rounded text-sm hover:border-gray-600 transition"
        type="button"
      >
        Filters
        {activeFilters > 0 && (
          <span className="text-blue-400 ml-1">({activeFilters})</span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute z-20 mt-2 bg-gray-800 border border-gray-700 rounded w-56 p-3 shadow-lg space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Min Open Interest
              </label>
              <input
                type="number"
                value={minOI}
                onChange={(e) =>
                  onMinOIChange(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="0"
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Min Volume
              </label>
              <input
                type="number"
                value={minVolume}
                onChange={(e) =>
                  onMinVolumeChange(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="0"
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
