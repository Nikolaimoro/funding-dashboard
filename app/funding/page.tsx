import { Metadata } from "next";
import FundingTableClient from "@/components/FundingTableClient";

export const metadata: Metadata = {
  title: "Funding Rates Dashboard",
  description: "Real-time cryptocurrency funding rates and opportunities across major exchanges",
  keywords: ["funding rates", "crypto", "arbitrage", "trading"],
  openGraph: {
    title: "Funding Rates Dashboard",
    description: "Real-time cryptocurrency funding rates and opportunities across major exchanges",
    type: "website",
  },
};

export default function HomePage() {
  return <FundingTableClient />;
}
