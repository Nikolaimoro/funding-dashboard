"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppHeader() {
  const path = usePathname();

  const link = (href: string, label: string) => {
    const active = path.startsWith(href);
    return (
      <Link
        href={href}
        className={`text-lg ${
          active
            ? "text-blue-400"
            : "text-gray-400 hover:text-gray-200"
        }`}
      >
        {label}
      </Link>
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
