"use client";

import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-roboto font-normal mb-2 text-gray-200">
        {title}
      </h1>
      {description && <p className="text-sm text-gray-400">{description}</p>}
    </div>
  );
}
