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
  const isHome = path === "/";
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

  const logoTone = isHome ? "dark" : "light";
  const logoClassName =
    logoTone === "light"
      ? "h-[18px] w-auto invert"
      : "h-[18px] w-auto invert-0";

  const burgerColor = isHome ? "black" : "white";

  const navLink = (href: string, label: string, isFirst = false) => {
    const active = path.startsWith(href);
    return (
      <Link
        href={href}
        className={[
          "group relative text-base font-roboto font-normal",
          isHome ? "text-[#201D1D] hover:bg-[#F2EFEC]" : "text-white hover:bg-[#383d50]",
          "px-2 py-2 rounded-lg transition-colors duration-200",
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
        className={`block w-full text-lg font-roboto font-normal py-3 text-left ${
          isHome ? "text-[#201D1D]" : "text-white"
        }`}
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
          "flex gap-2 border-b py-2 items-center",
          isHome
            ? "border-transparent bg-white"
            : "border-[#343a4e] bg-[#1c202f]",
          isHome ? "max-w-[1100px] px-8" : "max-w-[1600px] px-6",
          "mx-auto transition-transform duration-300",
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
          {!isHome && (
            <>
              {navLink("/funding", "Funding", true)}
              {navLink("/markets", "Markets")}
              {navLink("/arbitrage", "Arbitrage")}
              {navLink("/backtester", "Backtester")}
            </>
          )}
        </div>

        {isHome && (
          <div className="hidden md:flex ml-auto">
            <Link
              href="/funding"
              className="inline-flex items-center justify-center rounded-full bg-[#201D1D] text-white text-sm font-medium px-6 py-2.5 hover:opacity-90 transition-opacity"
            >
              Open App
            </Link>
          </div>
        )}

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
          "fixed inset-0 z-40 pt-[52px]",
          isHome ? "bg-white" : "bg-[#1c202f]",
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
          {isHome && (
            <Link
              href="/funding"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-6 w-full inline-flex items-center justify-center rounded-2xl bg-[#201D1D] text-white text-base font-medium py-3"
            >
              Open App
            </Link>
          )}
        </nav>
        <div className="mt-auto w-full px-10 pb-8">
          <div className={`border-t pt-5 ${isHome ? "border-[#E7E2E0]" : "border-[#343a4e]"}`}>
            <div className="flex items-center gap-3">
              <a
                href="https://x.com/bendbasis"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bendbasis on X"
                className={`inline-flex h-10 w-10 items-center justify-center transition ${
                  isHome ? "text-[#201D1D]" : "text-gray-200"
                }`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 fill-current"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.504 11.24h-6.662l-5.213-6.818-5.967 6.818H1.68l7.73-8.844L1.25 2.25h6.83l4.713 6.231L18.244 2.25zm-1.161 17.52h1.833L7.08 4.126H5.114l11.97 15.644z" />
                </svg>
              </a>
              <a
                href="https://t.me/bendbasis"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bendbasis on Telegram"
                className={`inline-flex h-10 w-10 items-center justify-center transition ${
                  isHome ? "text-[#201D1D]" : "text-gray-200"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-4 w-4 inline-block"
                  style={{
                    backgroundColor: "currentColor",
                    WebkitMaskImage: "url(/icons/social/telegram.svg)",
                    maskImage: "url(/icons/social/telegram.svg)",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                  }}
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
