"use client";

import { useSearchParams } from "next/navigation";
import BacktesterForm from "@/components/BacktesterForm";

interface BacktesterClientProps {
  tokens: string[];
  exchanges: { exchange: string; quotes: { asset: string; marketId: number }[] }[];
}

export default function BacktesterClient({ tokens, exchanges }: BacktesterClientProps) {
  const searchParams = useSearchParams();

  // Initialize from URL params or empty
  const initialToken = searchParams.get("token") || "";
  const initialLongEx = searchParams.get("exchange1") || "";
  const initialShortEx = searchParams.get("exchange2") || "";

  return (
    <BacktesterForm
      tokens={tokens}
      exchanges={exchanges}
      initialToken={initialToken}
      initialLongEx={initialLongEx}
      initialShortEx={initialShortEx}
    />
  );
}
