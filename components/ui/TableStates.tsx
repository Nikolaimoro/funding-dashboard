"use client";

interface TableLoadingStateProps {
  message: string;
}

export function TableLoadingState({ message }: TableLoadingStateProps) {
  return (
    <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
      <span className="h-4 w-4 rounded-full border-2 border-gray-600 border-t-blue-400 animate-spin" />
      {message}
    </div>
  );
}

interface TableEmptyStateProps {
  message: string;
}

export function TableEmptyState({ message }: TableEmptyStateProps) {
  return <div className="text-gray-500 text-sm mb-3">{message}</div>;
}
