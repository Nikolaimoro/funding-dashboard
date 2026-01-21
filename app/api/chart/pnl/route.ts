import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { RPC_FUNCTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const getNextHourPlusFiveSeconds = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 5, 0, 0);
  return Math.max(60, Math.floor((next.getTime() - now.getTime()) / 1000));
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const longMarketId = Number(url.searchParams.get("longMarketId"));
    const shortMarketId = Number(url.searchParams.get("shortMarketId"));
    const days = Number(url.searchParams.get("days") ?? 30);

    if (!Number.isFinite(longMarketId) || !Number.isFinite(shortMarketId)) {
      return NextResponse.json({ error: "longMarketId and shortMarketId required" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc(RPC_FUNCTIONS.ARB_PNL, {
      p_long_market_id: longMarketId,
      p_short_market_id: shortMarketId,
      p_days: Number.isFinite(days) ? days : 30,
    });

    if (error) {
      throw new Error(error.message);
    }

    const ttl = getNextHourPlusFiveSeconds();

    return NextResponse.json(
      { rows: data ?? [] },
      {
        headers: {
          "Cache-Control": `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=60`,
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
