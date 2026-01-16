"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

type LogoColor = "white" | "black";

export default function AppHeader() {
  const path = usePathname();
  const logoColorByRoute: Array<{ matcher: RegExp; color: LogoColor }> = [
    // Example: { matcher: /^\\/light/, color: "black" },
  ];
  const logoColor =
    logoColorByRoute.find(({ matcher }) => matcher.test(path))?.color ?? "white";

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
    <div className="flex flex-wrap items-center justify-between gap-6 mb-6 border-b border-gray-800 pb-3">
      <Link href="/funding" className="flex items-center" aria-label="Funding Dashboard">
        <BrandLogo color={logoColor} />
      </Link>
      <nav className="flex gap-6">
        {link("/funding", "Funding")}
        {link("/arbitrage", "Arbitrage")}
        {link("/backtester", "Backtester")}
      </nav>
    </div>
  );
}
