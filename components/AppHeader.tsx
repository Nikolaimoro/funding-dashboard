"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface BurgerIconProps {
  open: boolean;
  color?: "white" | "black";
  onClick: () => void;
}

function BurgerIcon({ open, color = "white", onClick }: BurgerIconProps) {
  const lineColor = color === "white" ? "bg-white" : "bg-black";
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-6 h-6 flex flex-col items-center justify-center gap-1.25"
      aria-label={open ? "Close menu" : "Open menu"}
    >
      <span
        className={`block w-[22px] h-[1.5px] ${lineColor} transition-all duration-300 ${
          open ? "rotate-45 translate-y-[4px]" : ""
        }`}
      />
      <span
        className={`block w-[22px] h-[1.5px] ${lineColor} transition-all duration-300 ${
          open ? "-rotate-45 -translate-y-[3px]" : ""
        }`}
      />
    </button>
  );
}

export default function AppHeader() {
  const path = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [path]);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // After 50px scroll, start hide/show behavior
      if (currentScrollY > 50) {
        // Scrolling down - hide header immediately
        if (currentScrollY > lastScrollY) {
          setIsVisible(false);
        }
        // Scrolling up - show header
        else if (currentScrollY < lastScrollY) {
          setIsVisible(true);
        }
      } else {
        // Within first 50px - always visible
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const logoToneByPath: Record<string, "light" | "dark"> = {
    "/markets": "light",
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

  const burgerColor = logoTone === "light" ? "white" : "black";

  const navLink = (href: string, label: string, isFirst = false) => {
    const active = path.startsWith(href);
    return (
      <Link
        href={href}
        className={[
          "group relative text-base text-white font-roboto font-normal",
          "px-2 py-2 rounded-md transition-colors duration-200",
          "hover:bg-[#383d50]",
          isFirst ? "ml-6" : "",
          // For non-active links, change origin on hover for left-to-right disappear
          !active ? "[&:not(:hover)>span]:origin-right [&:hover>span]:origin-left" : "",
        ].join(" ")}
      >
        {label}
        <span
          className={[
            "absolute left-0 right-0 h-[2px] bottom-[-9px]",
            "bg-gradient-to-r from-[#9E5DEE] to-[#FA814D]",
            "transition-transform duration-300 ease-out",
            active ? "scale-x-100 origin-left" : "scale-x-0 group-hover:scale-x-100",
          ].join(" ")}
        />
      </Link>
    );
  };

  const mobileNavLink = (href: string, label: string) => {
    return (
      <Link
        href={href}
        onClick={() => setMobileMenuOpen(false)}
        className="block w-full text-lg font-roboto font-normal py-3 text-left text-white"
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      {/* Spacer for fixed header */}
      <div className="h-[52px]" />
      
      <div
        className={[
          "fixed top-0 left-0 right-0 z-50",
          "flex gap-2 border-b border-[#343a4e] py-2 items-center bg-[#1c202f]",
          "max-w-[1600px] mx-auto px-6",
          "transition-transform duration-300",
          !isVisible && !mobileMenuOpen ? "-translate-y-full" : "translate-y-0",
        ].join(" ")}
      >
        <Link
          href="/markets"
          className="flex items-center pl-4"
          aria-label="Funding Dashboard Home"
        >
          <img
            src="/brand/logo.svg"
            alt="Funding Dashboard"
            className={logoClassName}
          />
        </Link>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-3">
          {navLink("/funding", "Funding", true)}
          {navLink("/markets", "Markets")}
          {navLink("/arbitrage", "Arbitrage")}
          {navLink("/backtester", "Backtester")}
        </div>

        {/* Mobile burger */}
        <div className="md:hidden ml-auto">
          <BurgerIcon
            open={mobileMenuOpen}
            color={burgerColor}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          />
        </div>
      </div>

      {/* Mobile full-screen menu */}
      <div
        className={[
          "fixed inset-0 z-40 bg-[#1c202f] pt-[52px]",
          "flex flex-col",
          "transition-all duration-300 ease-out md:hidden",
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto translate-y-0"
            : "opacity-0 pointer-events-none -translate-y-4",
        ].join(" ")}
      >
        <nav className="flex flex-col items-start gap-1 w-full pl-10 pr-6 pt-6">
          {mobileNavLink("/funding", "Funding")}
          {mobileNavLink("/markets", "Markets")}
          {mobileNavLink("/arbitrage", "Arbitrage")}
          {mobileNavLink("/backtester", "Backtester")}
        </nav>
      </div>
    </>
  );
}
