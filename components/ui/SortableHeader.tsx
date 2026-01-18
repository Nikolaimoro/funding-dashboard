/**
 * Sortable table header with visual indicators
 * Shows ↑↓ for inactive columns and highlights the active direction.
 */

interface SortableHeaderProps {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  centered?: boolean;
}

export default function SortableHeader({
  label,
  active,
  dir,
  onClick,
  centered = false,
}: SortableHeaderProps) {
  const upActive = active && dir === "asc";
  const downActive = active && dir === "desc";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 select-none cursor-pointer px-1 py-0.5 ${centered ? "justify-center w-full" : "text-left"}`}
    >
      <span className="text-gray-400">{label}</span>
      <span className="flex flex-col items-center leading-[0.7]">
        <span
          className={`text-[11px] inline-block origin-center scale-y-[0.6] ${upActive ? "text-gray-200" : "text-gray-500/70"}`}
        >
          ▲
        </span>
        <span
          className={`text-[11px] inline-block origin-center scale-y-[0.6] ${downActive ? "text-gray-200" : "text-gray-500/70"}`}
        >
          ▼
        </span>
      </span>
    </button>
  );
}
