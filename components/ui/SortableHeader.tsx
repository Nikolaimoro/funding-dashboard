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
      className="inline-flex items-center gap-1 text-left select-none"
    >
      <span
        className={active ? "text-gray-200" : "text-gray-400"}
      >
        {label}
      </span>

      {active && (
        <span className="text-[13px] text-blue-400">
          {dir === "asc" ? "↑" : "↓"}
        </span>
      )}
    </button>
  );
}
