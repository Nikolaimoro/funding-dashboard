"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppHeader() {
  const path = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [isSticky, setIsSticky] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // After 50px, header becomes sticky
      if (currentScrollY > 50) {
        setIsSticky(true);
        
        // Scrolling down - hide header
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false);
        }
        // Scrolling up - show header
        else if (currentScrollY < lastScrollY) {
          setIsVisible(true);
        }
      } else {
        setIsSticky(false);
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

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

  const link = (href: string, label: string, isFirst = false) => {
    const active = path.startsWith(href);
    return (
      <Link
        href={href}
        className={[
          "group relative text-base text-white font-roboto font-normal",
          "px-2 py-2 rounded-md transition-colors duration-200",
          "hover:bg-[#383d50]",
          isFirst ? "ml-4" : "",
        ].join(" ")}
      >
        {label}
        <span
          className={[
            "absolute left-0 right-0 h-[2px] bottom-[-9px]",
            "bg-gradient-to-r from-[#9E5DEE] to-[#FA814D]",
            "transition-transform duration-300 ease-out origin-left",
            active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
          ].join(" ")}
        />
      </Link>
    );
  };

  return (
    <>
      {/* Spacer for when header is fixed */}
      {isSticky && <div className="h-[52px]" />}
      
      <div
        className={[
          "flex gap-2 border-b border-[#343a4e] py-2 items-center pl-4 bg-[#1c202f] z-50",
          isSticky ? "fixed top-0 left-0 right-0 max-w-[1600px] mx-auto px-6" : "",
          "transition-transform duration-300",
          isSticky && !isVisible ? "-translate-y-full" : "translate-y-0",
        ].join(" ")}
      >
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
        {link("/funding", "Funding", true)}
        {link("/arbitrage", "Arbitrage")}
        {link("/backtester", "Backtester")}
      </div>
    </>
  );
}
