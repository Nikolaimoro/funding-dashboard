import SkeletonLoader from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#1c202f] p-6 text-gray-200">
      <div className="mb-6">
        <div className="h-8 w-72 rounded bg-[#292e40] animate-pulse" />
        <div className="mt-2 h-4 w-96 rounded bg-[#292e40] animate-pulse" />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-10 rounded bg-[#292e40] animate-pulse" />
        <div className="h-10 rounded bg-[#292e40] animate-pulse" />
        <div className="h-10 rounded bg-[#292e40] animate-pulse" />
      </div>

      <SkeletonLoader rows={8} columns={8} />
    </main>
  );
}
