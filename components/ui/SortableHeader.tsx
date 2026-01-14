/**
 * Sortable table header with visual indicators
 * Shows ↑↓ on hover for inactive columns, ↑ or ↓ in blue for active
 */

interface SortableHeaderProps {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}

export default function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: SortableHeaderProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1 text-left select-none"
    >
      <span
        className={`transition-colors ${
          active ? "text-gray-200" : "text-gray-400 group-hover:text-gray-200"
        }`}
      >
        {label}
      </span>

      {!active && (
        <span className="text-xs opacity-0 group-hover:opacity-60 transition-opacity text-gray-500">
          ↑↓
        </span>
      )}

      {active && (
        <span className="text-[13px] text-blue-400">
          {dir === "asc" ? "↑" : "↓"}
        </span>
      )}
    </button>
  );
}
