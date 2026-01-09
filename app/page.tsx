import { supabase } from "@/lib/supabase";
import FundingTable from "@/components/FundingTable";

export default async function HomePage() {
  const { data, error } = await supabase
    .from("funding_dashboard_mv")
    .select("*")
    .order("15d", { ascending: true });

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Error loading data: {error.message}
      </div>
    );
  }

  return <FundingTable rows={data ?? []} />;
}