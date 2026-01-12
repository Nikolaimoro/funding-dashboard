import ArbitrageTable from "@/components/ArbitrageTable";

export const metadata = {
  title: "Arbitrage | Funding Dashboard",
};

export default function ArbitragePage() {
  return (
    <main className="min-h-screen bg-gray-900 p-6 text-gray-200">
      <h1 className="text-2xl font-semibold mb-4">
        Arbitrage
      </h1>

      <ArbitrageTable />
    </main>
  );
}