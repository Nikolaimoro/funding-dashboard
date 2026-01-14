"use client";

import { usePathname } from "next/navigation";

export default function AppHeader() {
  const path = usePathname();

  const link = (href: string, label: string) => {
    const active = path.startsWith(href);
    return (
      <a
        href={href}
        className={`text-lg ${
          active
            ? "text-blue-400"
            : "text-gray-400 hover:text-gray-200"
        }`}
      >
        {label}
      </a>
    );
  };

  return (
    <div className="flex gap-6 mb-6 border-b border-gray-800 pb-3">
      {link("/funding", "Funding")}
      {link("/arbitrage", "Arbitrage")}
      {link("/backtester", "Backtester")}
    </div>
  );
}