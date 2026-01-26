import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { safeJsonLd } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500"],
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  weight: ["400", "500"],
  display: "swap",
});


export const metadata: Metadata = {
  metadataBase: new URL("https://bendbasis.com"),
  title: {
    default: "Funding Dashboard | bendbasis",
    template: "%s | bendbasis",
  },
  description: "Find funding arbitrage opportunities across crypto exchanges. Compare funding rates, analyze arbitrage spreads, and backtest strategies.",
  keywords: [
    "funding rates",
    "funding rates crypto",
    "funding history",
    "crypto",
    "arbitrage",
    "trading",
    "perpetual futures",
    "funding arbitrage",
  ],
  authors: [{ name: "bendbasis" }],
  icons: {
    icon: "/favicon.ico?v=2",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Funding Dashboard | bendbasis",
    description: "Find funding arbitrage opportunities across crypto exchanges",
    type: "website",
    siteName: "bendbasis",
    url: "https://bendbasis.com",
  },
  twitter: {
    card: "summary",
    title: "Funding Dashboard | bendbasis",
    description: "Find funding arbitrage opportunities across crypto exchanges",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "bendbasis Funding Dashboard",
              "url": "https://bendbasis.com",
              "description": "Find funding arbitrage opportunities across crypto exchanges. Compare funding rates, analyze arbitrage spreads, and backtest strategies.",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Organization",
                "name": "bendbasis",
                "url": "https://bendbasis.com"
              }
            }),
          }}
        />
      </head>
      <body
        className={`
          ${inter.variable} 
          ${roboto.variable}
          antialiased
          bg-[#1c202f]
          text-gray-200
        `}
      >
        {/* ====== page container ====== */}
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <AppHeader />

          <main className="mt-6">
            {children}
          </main>
          <AppFooter />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
