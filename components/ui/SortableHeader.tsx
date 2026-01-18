/**
 * Sortable table header with visual indicators
 * Shows ↑↓ for inactive columns and highlights the active direction.
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
  const upActive = active && dir === "asc";
  const downActive = active && dir === "desc";
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-left select-none"
    >
      <span className="text-gray-400">{label}</span>
      <span className="flex flex-col items-center leading-none">
        <span className={`text-[10px] ${upActive ? "text-gray-200" : "text-gray-500/70"}`}>
          ▲
        </span>
        <span className={`text-[10px] ${downActive ? "text-gray-200" : "text-gray-500/70"}`}>
          ▼
        </span>
      </span>
    </button>
  );
}
