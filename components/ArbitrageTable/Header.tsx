"use client";

import { ReactNode } from "react";

interface ArbitrageTableHeaderProps {
  title: string;
  description?: ReactNode;
}

/**
 * Page header component for Arbitrage Table
 * Displays title and optional description
 */
export default function ArbitrageTableHeader({ title, description }: ArbitrageTableHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold mb-2 text-gray-200">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-gray-400">
          {description}
        </p>
      )}
    </div>
  );
}
