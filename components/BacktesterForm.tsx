"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { ArrowRightLeft, RefreshCw, Search, ChevronDown } from "lucide-react";
import { normalizeToken } from "@/lib/formatters";
import { EXCHANGE_LABEL } from "@/lib/constants";
import { TAILWIND } from "@/lib/theme";
import ExchangeIcon from "@/components/ui/ExchangeIcon";
import dynamic from "next/dynamic";
import type { BacktesterChartData } from "@/lib/types/backtester";

const BacktesterChart = dynamic(() => import("@/components/BacktesterChart"), { ssr: false });

type Quote = { asset: string; marketId: number; refUrl: string | null; volume24h: number | null; openInterest: number | null };

interface BacktesterFormProps {
  tokens: string[];
  exchanges: { exchange: string; baseAssets: { asset: string; quotes: { asset: string; marketId: number; refUrl: string | null; volume24h: number | null; openInterest: number | null }[] }[] }[];
  initialToken?: string;
  initialLongEx?: string;
  initialShortEx?: string;
  initialLongQuote?: string;
  initialShortQuote?: string;
}

type ComboboxType = "token" | "long-ex" | "short-ex";

export default function BacktesterForm({ tokens, exchanges, initialToken = "", initialLongEx = "", initialShortEx = "", initialLongQuote = "", initialShortQuote = "" }: BacktesterFormProps) {
  const autoRunRef = useRef(false);
  const autoSyncRef = useRef<string>("");
  const [selectedToken, setSelectedToken] = useState<string>(initialToken);
  const [selectedLongEx, setSelectedLongEx] = useState<string>(initialLongEx);
  const [selectedLongQuote, setSelectedLongQuote] = useState<string>(initialLongQuote);
  const [selectedLongMarketId, setSelectedLongMarketId] = useState<number | null>(null);
  const [selectedLongRefUrl, setSelectedLongRefUrl] = useState<string | null>(null);
  const [selectedLongVolume24h, setSelectedLongVolume24h] = useState<number | null>(null);
  const [selectedLongOpenInterest, setSelectedLongOpenInterest] = useState<number | null>(null);
  const [selectedShortEx, setSelectedShortEx] = useState<string>(initialShortEx);
  const [selectedShortQuote, setSelectedShortQuote] = useState<string>(initialShortQuote);
  const [selectedShortMarketId, setSelectedShortMarketId] = useState<number | null>(null);
  const [selectedShortRefUrl, setSelectedShortRefUrl] = useState<string | null>(null);
  const [selectedShortVolume24h, setSelectedShortVolume24h] = useState<number | null>(null);
  const [selectedShortOpenInterest, setSelectedShortOpenInterest] = useState<number | null>(null);

  const [tokenSearch, setTokenSearch] = useState("");
  const [longExSearch, setLongExSearch] = useState("");
  const [shortExSearch, setShortExSearch] = useState("");

  const [openCombo, setOpenCombo] = useState<ComboboxType | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<BacktesterChartData | null>(initialToken && initialLongEx && initialShortEx ? { token: initialToken, longEx: initialLongEx, shortEx: initialShortEx, longQuote: "", shortQuote: "", longMarketId: 0, shortMarketId: 0, longRefUrl: null, shortRefUrl: null, longVolume24h: null, shortVolume24h: null, longOpenInterest: null, shortOpenInterest: null } : null);
  const [runToken, setRunToken] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filtered tokens - normalized
  const filteredTokens = useMemo(() => {
    if (!tokenSearch) return tokens;
    const q = normalizeToken(tokenSearch);
    return tokens.filter(t => normalizeToken(t).startsWith(q));
  }, [tokens, tokenSearch]);

  // Filtered long exchanges - only show exchanges that have the selected token
  const filteredLongEx = useMemo(() => {
    let available = exchanges;
    
    // Filter by selected token if exists
    if (selectedToken) {
      const normalizedToken = normalizeToken(selectedToken);
      available = exchanges.filter(ex => 
        ex.baseAssets.some(ba => normalizeToken(ba.asset) === normalizedToken)
      );
    }
    
    // Filter by search
    if (!longExSearch) return available;
    const q = longExSearch.toLowerCase();
    return available.filter(ex => {
      const label = EXCHANGE_LABEL[ex.exchange] || ex.exchange;
      return label.toLowerCase().startsWith(q) || ex.exchange.toLowerCase().startsWith(q);
    });
  }, [exchanges, longExSearch, selectedToken]);

  // Filtered short exchanges - only show exchanges that have the selected token
  const filteredShortEx = useMemo(() => {
    let available = exchanges;
    
    // Filter by selected token if exists
    if (selectedToken) {
      const normalizedToken = normalizeToken(selectedToken);
      available = exchanges.filter(ex => 
        ex.baseAssets.some(ba => normalizeToken(ba.asset) === normalizedToken)
      );
    }
    
    // Filter by search
    if (!shortExSearch) return available;
    const q = shortExSearch.toLowerCase();
    return available.filter(ex => {
      const label = EXCHANGE_LABEL[ex.exchange] || ex.exchange;
      return label.toLowerCase().startsWith(q) || ex.exchange.toLowerCase().startsWith(q);
    });
  }, [exchanges, shortExSearch, selectedToken]);

  // Close combobox when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenCombo(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset selected exchanges when token changes (they may not have the new token)
  useEffect(() => {
    if (selectedToken && selectedLongEx) {
      const ex = exchanges.find(e => e.exchange === selectedLongEx);
      const normalizedToken = normalizeToken(selectedToken);
      if (!ex?.baseAssets.some(ba => normalizeToken(ba.asset) === normalizedToken)) {
        setSelectedLongEx("");
        setSelectedLongQuote("");
        setSelectedLongMarketId(null);
        setSelectedLongRefUrl(null);
        setSelectedLongVolume24h(null);
        setSelectedLongOpenInterest(null);
      }
    }
    if (selectedToken && selectedShortEx) {
      const ex = exchanges.find(e => e.exchange === selectedShortEx);
      const normalizedToken = normalizeToken(selectedToken);
      if (!ex?.baseAssets.some(ba => normalizeToken(ba.asset) === normalizedToken)) {
        setSelectedShortEx("");
        setSelectedShortQuote("");
        setSelectedShortMarketId(null);
        setSelectedShortRefUrl(null);
        setSelectedShortVolume24h(null);
        setSelectedShortOpenInterest(null);
      }
    }
  }, [selectedToken, exchanges]);

  // Auto-fill quote when exchange is selected (prefer USDT, fallback to first available)
  useEffect(() => {
    if (selectedLongEx && selectedToken) {
      const ex = exchanges.find(e => e.exchange === selectedLongEx);
      const normalizedToken = normalizeToken(selectedToken);
      const baseAsset = ex?.baseAssets.find(ba => normalizeToken(ba.asset) === normalizedToken);
      if (!baseAsset?.quotes?.length) return;
      const preferred = baseAsset.quotes.find(q => q.asset === "USDT") ?? baseAsset.quotes[0];
      const currentValid = baseAsset.quotes.some(q => q.asset === selectedLongQuote);
      if (!selectedLongQuote || !currentValid) {
        setSelectedLongQuote(preferred.asset);
        setSelectedLongMarketId(preferred.marketId);
        setSelectedLongRefUrl(preferred.refUrl);
        setSelectedLongVolume24h(preferred.volume24h ?? null);
        setSelectedLongOpenInterest(preferred.openInterest ?? null);
      }
    }
  }, [selectedLongEx, selectedToken, selectedLongQuote, exchanges]);

  useEffect(() => {
    if (selectedShortEx && selectedToken) {
      const ex = exchanges.find(e => e.exchange === selectedShortEx);
      const normalizedToken = normalizeToken(selectedToken);
      const baseAsset = ex?.baseAssets.find(ba => normalizeToken(ba.asset) === normalizedToken);
      if (!baseAsset?.quotes?.length) return;
      const preferred = baseAsset.quotes.find(q => q.asset === "USDT") ?? baseAsset.quotes[0];
      const currentValid = baseAsset.quotes.some(q => q.asset === selectedShortQuote);
      if (!selectedShortQuote || !currentValid) {
        setSelectedShortQuote(preferred.asset);
        setSelectedShortMarketId(preferred.marketId);
        setSelectedShortRefUrl(preferred.refUrl);
        setSelectedShortVolume24h(preferred.volume24h ?? null);
        setSelectedShortOpenInterest(preferred.openInterest ?? null);
      }
    }
  }, [selectedShortEx, selectedToken, selectedShortQuote, exchanges]);

  // Initialize marketIds when initializing from URL parameters
  useEffect(() => {
    if (initialToken && initialLongEx && initialLongQuote && !selectedLongMarketId) {
      const ex = exchanges.find(e => e.exchange === initialLongEx);
      const normalizedToken = normalizeToken(initialToken);
      const baseAsset = ex?.baseAssets.find(ba => normalizeToken(ba.asset) === normalizedToken);
      const quote = baseAsset?.quotes.find(q => q.asset === initialLongQuote);
      if (quote) {
        setSelectedLongMarketId(quote.marketId);
        setSelectedLongRefUrl(quote.refUrl);
        setSelectedLongVolume24h(quote.volume24h ?? null);
        setSelectedLongOpenInterest(quote.openInterest ?? null);
      }
    }
    if (initialToken && initialShortEx && initialShortQuote && !selectedShortMarketId) {
      const ex = exchanges.find(e => e.exchange === initialShortEx);
      const normalizedToken = normalizeToken(initialToken);
      const baseAsset = ex?.baseAssets.find(ba => normalizeToken(ba.asset) === normalizedToken);
      const quote = baseAsset?.quotes.find(q => q.asset === initialShortQuote);
      if (quote) {
        setSelectedShortMarketId(quote.marketId);
        setSelectedShortRefUrl(quote.refUrl);
        setSelectedShortVolume24h(quote.volume24h ?? null);
        setSelectedShortOpenInterest(quote.openInterest ?? null);
      }
    }
  }, [initialToken, initialLongEx, initialLongQuote, initialShortEx, initialShortQuote, exchanges]);

  // Auto-run chart when opening with URL params and market IDs are resolved
  useEffect(() => {
    const shouldAutoRun = Boolean(initialToken && initialLongEx && initialShortEx);
    if (!shouldAutoRun || autoRunRef.current) return;
    if (
      selectedToken &&
      selectedLongEx &&
      selectedShortEx &&
      selectedLongQuote &&
      selectedShortQuote &&
      selectedLongMarketId &&
      selectedShortMarketId
    ) {
      if (typeof window !== "undefined" && !window.location.search) {
        const exchange1 = `${selectedLongEx}${selectedLongQuote.toLowerCase()}`;
        const exchange2 = `${selectedShortEx}${selectedShortQuote.toLowerCase()}`;
        const params = new URLSearchParams({
          token: selectedToken,
          exchange1,
          exchange2,
        });
        window.history.replaceState({}, "", `?${params.toString()}`);
      }
      setChartData({
        token: selectedToken,
        longEx: selectedLongEx,
        shortEx: selectedShortEx,
        longQuote: selectedLongQuote,
        shortQuote: selectedShortQuote,
        longMarketId: selectedLongMarketId,
        shortMarketId: selectedShortMarketId,
        longRefUrl: selectedLongRefUrl,
        shortRefUrl: selectedShortRefUrl,
        longVolume24h: selectedLongVolume24h,
        shortVolume24h: selectedShortVolume24h,
        longOpenInterest: selectedLongOpenInterest,
        shortOpenInterest: selectedShortOpenInterest,
      });
      setRunToken((t) => t + 1);
      autoRunRef.current = true;
    }
  }, [
    initialToken,
    initialLongEx,
    initialShortEx,
    selectedToken,
    selectedLongEx,
    selectedShortEx,
    selectedLongQuote,
    selectedShortQuote,
    selectedLongMarketId,
    selectedShortMarketId,
    selectedLongRefUrl,
    selectedShortRefUrl,
    selectedLongVolume24h,
    selectedShortVolume24h,
    selectedLongOpenInterest,
    selectedShortOpenInterest,
  ]);

  // Auto-run and sync URL when fields are valid (no Run click needed)
  useEffect(() => {
    if (
      !selectedToken ||
      !selectedLongEx ||
      !selectedShortEx ||
      !selectedLongQuote ||
      !selectedShortQuote ||
      !selectedLongMarketId ||
      !selectedShortMarketId
    ) {
      return;
    }

    const exchange1 = `${selectedLongEx}${selectedLongQuote.toLowerCase()}`;
    const exchange2 = `${selectedShortEx}${selectedShortQuote.toLowerCase()}`;
    const params = new URLSearchParams({
      token: selectedToken,
      exchange1,
      exchange2,
    });
    const nextQuery = `?${params.toString()}`;

    if (typeof window !== "undefined" && window.location.search !== nextQuery && autoSyncRef.current !== nextQuery) {
      window.history.replaceState({}, "", nextQuery);
      autoSyncRef.current = nextQuery;
    }

    setChartData({
      token: selectedToken,
      longEx: selectedLongEx,
      shortEx: selectedShortEx,
      longQuote: selectedLongQuote,
      shortQuote: selectedShortQuote,
      longMarketId: selectedLongMarketId,
      shortMarketId: selectedShortMarketId,
      longRefUrl: selectedLongRefUrl,
      shortRefUrl: selectedShortRefUrl,
      longVolume24h: selectedLongVolume24h,
      shortVolume24h: selectedShortVolume24h,
      longOpenInterest: selectedLongOpenInterest,
      shortOpenInterest: selectedShortOpenInterest,
    });
    setRunToken((t) => t + 1);
  }, [
    selectedToken,
    selectedLongEx,
    selectedShortEx,
    selectedLongQuote,
    selectedShortQuote,
    selectedLongMarketId,
    selectedShortMarketId,
    selectedLongRefUrl,
    selectedShortRefUrl,
    selectedLongVolume24h,
    selectedShortVolume24h,
    selectedLongOpenInterest,
    selectedShortOpenInterest,
  ]);

  const handleSwapExchanges = () => {
    const tempEx = selectedLongEx;
    const tempQuote = selectedLongQuote;
    const tempMarketId = selectedLongMarketId;
    const tempRefUrl = selectedLongRefUrl;
    const tempVolume = selectedLongVolume24h;
    const tempOI = selectedLongOpenInterest;
    setSelectedLongEx(selectedShortEx);
    setSelectedLongQuote(selectedShortQuote);
    setSelectedLongMarketId(selectedShortMarketId);
    setSelectedLongRefUrl(selectedShortRefUrl);
    setSelectedLongVolume24h(selectedShortVolume24h);
    setSelectedLongOpenInterest(selectedShortOpenInterest);
    setSelectedShortEx(tempEx);
    setSelectedShortQuote(tempQuote);
    setSelectedShortMarketId(tempMarketId);
    setSelectedShortRefUrl(tempRefUrl);
    setSelectedShortVolume24h(tempVolume);
    setSelectedShortOpenInterest(tempOI);
  };

  const handleRun = async () => {
    if (!selectedToken || !selectedLongEx || !selectedLongQuote || !selectedShortEx || !selectedShortQuote || !selectedLongMarketId || !selectedShortMarketId) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Update URL parameters with exchange+quote format (e.g., binanceusdt, bybitusdc)
      const exchange1 = `${selectedLongEx}${selectedLongQuote.toLowerCase()}`;
      const exchange2 = `${selectedShortEx}${selectedShortQuote.toLowerCase()}`;
      const params = new URLSearchParams({
        token: selectedToken,
        exchange1,
        exchange2,
      });
      window.history.replaceState({}, "", `?${params.toString()}`);

      // Set chart data with market IDs and ref URLs
      setChartData({
        token: selectedToken,
        longEx: selectedLongEx,
        shortEx: selectedShortEx,
        longQuote: selectedLongQuote,
        shortQuote: selectedShortQuote,
        longMarketId: selectedLongMarketId,
        shortMarketId: selectedShortMarketId,
        longRefUrl: selectedLongRefUrl,
        shortRefUrl: selectedShortRefUrl,
        longVolume24h: selectedLongVolume24h,
        shortVolume24h: selectedShortVolume24h,
        longOpenInterest: selectedLongOpenInterest,
        shortOpenInterest: selectedShortOpenInterest,
      });
      setRunToken((t) => t + 1);
    } catch (error) {
      console.error("Backtest failed:", error);
      alert("Failed to run backtest");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Compact Input Panel */}
      <div className={`${TAILWIND.bg.surface} ${TAILWIND.border.default} rounded-2xl p-4`}>
        <div className="flex flex-wrap items-end gap-3">
          {/* Token Combobox */}
          <div className="relative flex-1 min-w-[140px]">
            <label className="block text-xs text-gray-500 mb-1">Token</label>
            <button
              onClick={() => setOpenCombo(openCombo === "token" ? null : "token")}
              className={`${TAILWIND.button.secondary} w-full text-left text-sm inline-flex items-center justify-between gap-2`}
            >
              <span className="truncate">{selectedToken || "Select token..."}</span>
              <Search className="h-4 w-4 text-gray-300 shrink-0" />
            </button>

            {openCombo === "token" && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenCombo(null)} />
                <div className="absolute z-20 w-full mt-1 bg-[#292e40] border border-[#343a4e] rounded-lg shadow-lg animate-tooltip-zoom">
                  <input
                    type="text"
                    placeholder="Search tokens..."
                    value={tokenSearch}
                    onChange={e => setTokenSearch(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1c202f] border-b border-[#343a4e] rounded-t-lg text-sm text-gray-200 focus:outline-none"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto">
                    {filteredTokens.map(token => (
                      <button
                        key={token}
                        onClick={() => {
                          setSelectedToken(token);
                          setTokenSearch("");
                          setOpenCombo(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[#353b52] transition"
                      >
                        {token}
                      </button>
                    ))}
                    {filteredTokens.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">No tokens found</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Long Exchange */}
          <div className="relative flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-500 mb-1">Long</label>
            <button
              onClick={() => setOpenCombo(openCombo === "long-ex" ? null : "long-ex")}
              className={`${TAILWIND.button.secondary} w-full text-left text-sm inline-flex items-center justify-between gap-2`}
            >
              {selectedLongEx ? (
                <span className="inline-flex items-center gap-2 truncate">
                  <ExchangeIcon exchange={selectedLongEx} size={16} />
                  {EXCHANGE_LABEL[selectedLongEx] || selectedLongEx}{selectedLongQuote ? ` (${selectedLongQuote})` : ""}
                </span>
              ) : (
                <span className="truncate">Select...</span>
              )}
              <ChevronDown className="h-4 w-4 text-gray-300 shrink-0" />
            </button>

            {openCombo === "long-ex" && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenCombo(null)} />
                <div className="absolute z-20 w-80 mt-1 bg-[#292e40] border border-[#343a4e] rounded-lg shadow-lg animate-tooltip-zoom">
                  <input
                    type="text"
                    placeholder="Search exchanges..."
                    value={longExSearch}
                    onChange={e => setLongExSearch(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1c202f] border-b border-[#343a4e] rounded-t-lg text-sm text-gray-200 focus:outline-none"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto">
                    {filteredLongEx.map(ex => {
                      const normalizedToken = normalizeToken(selectedToken);
                      const baseAsset = ex.baseAssets.find(ba => normalizeToken(ba.asset) === normalizedToken);
                      if (!baseAsset) return null;
                      
                      return (
                        <div key={ex.exchange} className="border-b border-[#343a4e] last:border-b-0">
                          {baseAsset.quotes.map((quote: Quote) => (
                            <button
                              key={`${ex.exchange}-${quote.asset}`}
                              onClick={() => {
                                setSelectedLongEx(ex.exchange);
                                setSelectedLongQuote(quote.asset);
                                setSelectedLongMarketId(quote.marketId);
                                setSelectedLongRefUrl(quote.refUrl);
                                setSelectedLongVolume24h(quote.volume24h ?? null);
                                setSelectedLongOpenInterest(quote.openInterest ?? null);
                                setLongExSearch("");
                                setOpenCombo(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-[#353b52] transition flex items-center gap-2"
                            >
                              <ExchangeIcon exchange={ex.exchange} size={16} />
                              {EXCHANGE_LABEL[ex.exchange] || ex.exchange}{baseAsset.quotes.length > 1 ? ` (${quote.asset})` : ""}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                    {filteredLongEx.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">No exchanges found</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwapExchanges}
            disabled={!selectedLongEx || !selectedShortEx}
            className={`${TAILWIND.button.secondary} h-9 w-9 flex items-center justify-center p-0`}
            title="Swap Long and Short"
          >
            <ArrowRightLeft size={22} />
          </button>

          {/* Short Exchange */}
          <div className="relative flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-500 mb-1">Short</label>
            <button
              onClick={() => setOpenCombo(openCombo === "short-ex" ? null : "short-ex")}
              className={`${TAILWIND.button.secondary} w-full text-left text-sm inline-flex items-center justify-between gap-2`}
            >
              {selectedShortEx ? (
                <span className="inline-flex items-center gap-2 truncate">
                  <ExchangeIcon exchange={selectedShortEx} size={16} />
                  {EXCHANGE_LABEL[selectedShortEx] || selectedShortEx}{selectedShortQuote ? ` (${selectedShortQuote})` : ""}
                </span>
              ) : (
                <span className="truncate">Select...</span>
              )}
              <ChevronDown className="h-4 w-4 text-gray-300 shrink-0" />
            </button>

            {openCombo === "short-ex" && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenCombo(null)} />
                <div className="absolute z-20 w-80 mt-1 bg-[#292e40] border border-[#343a4e] rounded-lg shadow-lg animate-tooltip-zoom">
                  <input
                    type="text"
                    placeholder="Search exchanges..."
                    value={shortExSearch}
                    onChange={e => setShortExSearch(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1c202f] border-b border-[#343a4e] rounded-t-lg text-sm text-gray-200 focus:outline-none"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto">
                    {filteredShortEx.map(ex => {
                      const normalizedToken = normalizeToken(selectedToken);
                      const baseAsset = ex.baseAssets.find(ba => normalizeToken(ba.asset) === normalizedToken);
                      if (!baseAsset) return null;
                      
                      return (
                        <div key={ex.exchange} className="border-b border-[#343a4e] last:border-b-0">
                          {baseAsset.quotes.map((quote: Quote) => (
                            <button
                              key={`${ex.exchange}-${quote.asset}`}
                              onClick={() => {
                                setSelectedShortEx(ex.exchange);
                                setSelectedShortQuote(quote.asset);
                                setSelectedShortMarketId(quote.marketId);
                                setSelectedShortRefUrl(quote.refUrl);
                                setSelectedShortVolume24h(quote.volume24h ?? null);
                                setSelectedShortOpenInterest(quote.openInterest ?? null);
                                setShortExSearch("");
                                setOpenCombo(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-[#353b52] transition flex items-center gap-2"
                            >
                              <ExchangeIcon exchange={ex.exchange} size={16} />
                              {EXCHANGE_LABEL[ex.exchange] || ex.exchange}{baseAsset.quotes.length > 1 ? ` (${quote.asset})` : ""}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                    {filteredShortEx.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">No exchanges found</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RUN Button - compact */}
          <button
            onClick={handleRun}
            disabled={loading || !selectedToken || !selectedLongEx || !selectedShortEx}
            className={`${TAILWIND.button.secondary} h-9 px-3 flex items-center gap-1.5 text-sm`}
            title="Reload data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Run</span>
          </button>
        </div>
      </div>

      {/* Chart Card */}
      <Suspense
        fallback={(
          <div className={`${TAILWIND.bg.surface} ${TAILWIND.border.default} rounded-xl p-6 h-96 flex items-center justify-center text-gray-400`}>
            Loading chart...
          </div>
        )}
      >
        <BacktesterChart chartData={chartData} selectedLongEx={selectedLongEx} selectedShortEx={selectedShortEx} runToken={runToken} />
      </Suspense>
    </div>
  );
}
