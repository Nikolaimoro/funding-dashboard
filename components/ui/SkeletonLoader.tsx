/**
 * Loading skeleton for tables
 * Shows placeholder rows while data is loading
 */

interface SkeletonLoaderProps {
  rows?: number;
  columns?: number;
}

export default function SkeletonLoader({ rows = 5, columns = 8 }: SkeletonLoaderProps) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 bg-gray-800 rounded">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-gray-700 rounded flex-1"
              style={{ width: `${Math.random() * 100 + 50}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
