"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppHeader() {
  const path = usePathname();
  const logoToneByPath: Record<string, "light" | "dark"> = {
    "/funding": "light",
    "/arbitrage": "light",
    "/backtester": "light",
  };
  const logoTone =
    Object.entries(logoToneByPath).find(([route]) => path.startsWith(route))
      ?.[1] ?? "light";
  const logoClassName =
    logoTone === "light"
      ? "h-[18px] w-auto invert"
      : "h-[18px] w-auto invert-0";

  const link = (href: string, label: string) => {
    const active = path.startsWith(href);
    return (
      <Link
        href={href}
        className={`text-base text-white font-outfit font-normal ${
          active ? "opacity-100" : "opacity-80 hover:opacity-100"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="flex items-center gap-6 mb-6 border-b border-gray-800 pb-3 items-end">
      <Link
        href="/funding"
        className="flex items-center"
        aria-label="Funding Dashboard Home"
      >
        <img
          src="/brand/logo.svg"
          alt="Funding Dashboard"
          className={logoClassName}
        />
      </Link>
      {link("/funding", "Funding")}
      {link("/arbitrage", "Arbitrage")}
      {link("/backtester", "Backtester")}
    </div>
  );
}
