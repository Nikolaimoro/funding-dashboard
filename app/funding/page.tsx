import { Metadata } from "next";
import FundingScreener from "@/components/FundingScreener";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Funding Rate Arbitrage Screener | bendbasis",
  description: "Screen funding rate arbitrage opportunities across major crypto exchanges",
  keywords: ["funding rates", "crypto", "arbitrage", "screener", "trading"],
  openGraph: {
    title: "Funding Rate Arbitrage Screener | bendbasis",
    description: "Screen funding rate arbitrage opportunities across major crypto exchanges",
    type: "website",
  },
};

export default function FundingPage() {
  return (
    <main className="min-h-screen text-gray-200">
      <PageHeader
        title="Funding Rate Screener"
        description="Compare funding rates across exchanges to find arbitrage opportunities"
      />
      <FundingScreener />
    </main>
  );
}
