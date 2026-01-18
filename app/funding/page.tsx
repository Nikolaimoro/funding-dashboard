import { Metadata } from "next";
import FundingTableClient from "@/components/FundingTableClient";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Crypto Funding Rates Arbitrage Dashboard | bendbasis",
  description: "Real-time cryptocurrency funding rates and opportunities across major exchanges",
  keywords: ["funding rates", "crypto", "arbitrage", "trading"],
  openGraph: {
    title: "Crypto Funding Rates Arbitrage Dashboard | bendbasis",
    description: "Real-time cryptocurrency funding rates and opportunities across major exchanges",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="min-h-screen text-gray-200">
      <div className="pl-4">
        <PageHeader
          title="Funding rates"
          description="Average rates across exchanges, annualized and aggregated"
        />
      </div>
      <FundingTableClient />
    </main>
  );
}
