"use client";

import { ReactNode } from "react";

interface FundingTableHeaderProps {
  title: string;
  description?: ReactNode;
}

/**
 * Page header component for Funding Table
 * Displays title and optional description
 */
export default function FundingTableHeader({ title, description }: FundingTableHeaderProps) {
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
