import ArbitrageTable from "@/components/ArbitrageTable";

export const revalidate = 0;

export const metadata = {
  title: "Arbitrage | Funding Dashboard",
};

export default function ArbitragePage() {
  return (
    <main className="min-h-screen bg-gray-900 p-6 text-gray-200">
<div className="mb-4 flex flex-wrap items-end justify-between gap-3">
  <h1 className="text-2xl font-semibold">
    Arbitrage Top Opportunities
  </h1>

  <p className="max-w-xl text-sm text-gray-200">
    Last 15 days
  </p>
</div>

      <ArbitrageTable />
    </main>
  );
}