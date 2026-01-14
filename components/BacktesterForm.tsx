"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { ArrowRightLeft } from "lucide-react";
import { normalizeToken } from "@/lib/formatters";
import { EXCHANGE_LABEL } from "@/lib/constants";
import { TAILWIND } from "@/lib/theme";
import dynamic from "next/dynamic";
import type { BacktesterChartData } from "@/lib/types/backtester";

const BacktesterChart = dynamic(() => import("@/components/BacktesterChart"), { ssr: false });

interface BacktesterFormProps {
  tokens: string[];
  exchanges: { exchange: string; baseAssets: { asset: string; quotes: { asset: string; marketId: number; refUrl: string | null }[] }[] }[];
  initialToken?: string;
  initialLongEx?: string;
  initialShortEx?: string;
  initialLongQuote?: string;
  initialShortQuote?: string;
}

type ComboboxType = "token" | "long-ex" | "short-ex";

export default function BacktesterForm({ tokens, exchanges, initialToken = "", initialLongEx = "", initialShortEx = "", initialLongQuote = "", initialShortQuote = "" }: BacktesterFormProps) {
  const [selectedToken, setSelectedToken] = useState<string>(initialToken);
  const [selectedLongEx, setSelectedLongEx] = useState<string>(initialLongEx);
  const [selectedLongQuote, setSelectedLongQuote] = useState<string>(initialLongQuote);
  const [selectedLongMarketId, setSelectedLongMarketId] = useState<number | null>(null);
  const [selectedLongRefUrl, setSelectedLongRefUrl] = useState<string | null>(null);
  const [selectedShortEx, setSelectedShortEx] = useState<string>(initialShortEx);
  const [selectedShortQuote, setSelectedShortQuote] = useState<string>(initialShortQuote);
  const [selectedShortMarketId, setSelectedShortMarketId] = useState<number | null>(null);
  const [selectedShortRefUrl, setSelectedShortRefUrl] = useState<string | null>(null);

  const [tokenSearch, setTokenSearch] = useState("");
  const [longExSearch, setLongExSearch] = useState("");
  const [shortExSearch, setShortExSearch] = useState("");

  const [openCombo, setOpenCombo] = useState<ComboboxType | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<BacktesterChartData | null>(initialToken && initialLongEx && initialShortEx ? { token: initialToken, longEx: initialLongEx, shortEx: initialShortEx, longQuote: "", shortQuote: "", longMarketId: 0, shortMarketId: 0, longRefUrl: null, shortRefUrl: null } : null);

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
      }
    }
  }, [selectedToken, exchanges]);

  // Auto-fill quote when exchange is selected (pick first available quote for the token)
  useEffect(() => {
    if (selectedLongEx && !selectedLongQuote && selectedToken) {
      const ex = exchanges.find(e => e.exchange === selectedLongEx);
      const normalizedToken = normalizeToken(selectedToken);
      const baseAsset = ex?.baseAssets.find(ba => normalizeToken(ba.asset) === normalizedToken);
      if (baseAsset?.quotes[0]) {
        setSelectedLongQuote(baseAsset.quotes[0].asset);
        setSelectedLongMarketId(baseAsset.quotes[0].marketId);
        setSelectedLongRefUrl(baseAsset.quotes[0].refUrl);
      }
    }
  }, [selectedLongEx, selectedToken]);

  useEffect(() => {
    if (selectedShortEx && !selectedShortQuote && selectedToken) {
      const ex = exchanges.find(e => e.exchange === selectedShortEx);
      const normalizedToken = normalizeToken(selectedToken);
      const baseAsset = ex?.baseAssets.find(ba => normalizeToken(ba.asset) === normalizedToken);
      if (baseAsset?.quotes[0]) {
        setSelectedShortQuote(baseAsset.quotes[0].asset);
        setSelectedShortMarketId(baseAsset.quotes[0].marketId);
        setSelectedShortRefUrl(baseAsset.quotes[0].refUrl);
      }
    }
  }, [selectedShortEx]);

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
      }
    }
  }, [initialToken, initialLongEx, initialLongQuote, initialShortEx, initialShortQuote, exchanges]);

  const handleSwapExchanges = () => {
    const tempEx = selectedLongEx;
    const tempQuote = selectedLongQuote;
    const tempMarketId = selectedLongMarketId;
    const tempRefUrl = selectedLongRefUrl;
    setSelectedLongEx(selectedShortEx);
    setSelectedLongQuote(selectedShortQuote);
    setSelectedLongMarketId(selectedShortMarketId);
    setSelectedLongRefUrl(selectedShortRefUrl);
    setSelectedShortEx(tempEx);
    setSelectedShortQuote(tempQuote);
    setSelectedShortMarketId(tempMarketId);
    setSelectedShortRefUrl(tempRefUrl);
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
      });
    } catch (error) {
      console.error("Backtest failed:", error);
      alert("Failed to run backtest");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Inputs Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-200">Inputs</h2>

        <div className="space-y-4">
          {/* Token Combobox */}
          <div className="relative">
            <label className="block text-sm text-gray-400 mb-1">Token</label>
            <button
              onClick={() => setOpenCombo(openCombo === "token" ? null : "token")}
              className={`w-full px-3 py-2 rounded border ${
                openCombo === "token"
                  ? "border-blue-500 bg-gray-700"
                  : "border-gray-600 bg-gray-700 hover:border-gray-500"
              } text-left transition`}
            >
              {selectedToken || "Select or type token..."}
            </button>

            {openCombo === "token" && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenCombo(null)} />
                <div className="absolute z-20 w-full mt-1 bg-gray-900 border border-gray-600 rounded shadow-lg">
                  <input
                    type="text"
                    placeholder="Search tokens..."
                    value={tokenSearch}
                    onChange={e => setTokenSearch(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border-b border-gray-700 rounded-t text-sm"
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
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition"
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

          {/* Long and Short Exchanges */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
            {/* Long Exchange */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Long</label>
              <button
                onClick={() => setOpenCombo(openCombo === "long-ex" ? null : "long-ex")}
                className={`w-full px-3 py-2 rounded border text-left text-sm transition ${
                  openCombo === "long-ex"
                    ? "border-blue-500 bg-gray-700"
                    : "border-gray-600 bg-gray-700 hover:border-gray-500"
                }`}
              >
                {selectedLongEx ? `${EXCHANGE_LABEL[selectedLongEx] || selectedLongEx}${selectedLongQuote ? ` (${selectedLongQuote})` : ""}` : "Select..."}
              </button>

              {openCombo === "long-ex" && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenCombo(null)} />
                  <div className="absolute z-20 w-80 mt-1 bg-gray-900 border border-gray-600 rounded shadow-lg">
                    <input
                      type="text"
                      placeholder="Search exchanges..."
                      value={longExSearch}
                      onChange={e => setLongExSearch(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border-b border-gray-700 rounded-t text-sm"
                      autoFocus
                    />
                    <div className="max-h-48 overflow-y-auto">
                      {filteredLongEx.map(ex => {
                        const normalizedToken = normalizeToken(selectedToken);
                        const baseAsset = ex.baseAssets.find(ba => normalizeToken(ba.asset) === normalizedToken);
                        if (!baseAsset) return null;
                        
                        return (
                          <div key={ex.exchange} className="border-b border-gray-700 last:border-b-0">
                            {baseAsset.quotes.map((quote: any) => (
                              <button
                                key={`${ex.exchange}-${quote.asset}`}
                                onClick={() => {
                                  setSelectedLongEx(ex.exchange);
                                  setSelectedLongQuote(quote.asset);
                                  setSelectedLongMarketId(quote.marketId);
                                  setSelectedLongRefUrl(quote.refUrl);
                                  setLongExSearch("");
                                  setOpenCombo(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition"
                              >
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
              className="p-2 rounded border border-gray-600 hover:border-gray-500 hover:text-blue-400 disabled:opacity-40 transition"
              title="Swap Long and Short"
            >
              <ArrowRightLeft size={18} />
            </button>

            {/* Short Exchange */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Short</label>
              <button
                onClick={() => setOpenCombo(openCombo === "short-ex" ? null : "short-ex")}
                className={`w-full px-3 py-2 rounded border text-left text-sm transition ${
                  openCombo === "short-ex"
                    ? "border-blue-500 bg-gray-700"
                    : "border-gray-600 bg-gray-700 hover:border-gray-500"
                }`}
              >
                {selectedShortEx ? `${EXCHANGE_LABEL[selectedShortEx] || selectedShortEx}${selectedShortQuote ? ` (${selectedShortQuote})` : ""}` : "Select..."}
              </button>

              {openCombo === "short-ex" && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenCombo(null)} />
                  <div className="absolute z-20 w-80 mt-1 bg-gray-900 border border-gray-600 rounded shadow-lg">
                    <input
                      type="text"
                      placeholder="Search exchanges..."
                      value={shortExSearch}
                      onChange={e => setShortExSearch(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border-b border-gray-700 rounded-t text-sm"
                      autoFocus
                    />
                    <div className="max-h-48 overflow-y-auto">
                      {filteredShortEx.map(ex => {
                        const normalizedToken = normalizeToken(selectedToken);
                        const baseAsset = ex.baseAssets.find(ba => normalizeToken(ba.asset) === normalizedToken);
                        if (!baseAsset) return null;
                        
                        return (
                          <div key={ex.exchange} className="border-b border-gray-700 last:border-b-0">
                            {baseAsset.quotes.map((quote: any) => (
                              <button
                                key={`${ex.exchange}-${quote.asset}`}
                                onClick={() => {
                                  setSelectedShortEx(ex.exchange);
                                  setSelectedShortQuote(quote.asset);
                                  setSelectedShortMarketId(quote.marketId);
                                  setSelectedShortRefUrl(quote.refUrl);
                                  setShortExSearch("");
                                  setOpenCombo(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition"
                              >
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
          </div>

          {/* RUN Button */}
          <button
            onClick={handleRun}
            disabled={loading || !selectedToken || !selectedLongEx || !selectedShortEx}
            className="w-full px-4 py-2 mt-2 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:opacity-50 text-white font-semibold transition"
          >
            {loading ? "Running..." : "RUN"}
          </button>
        </div>
      </div>

      {/* Chart Card */}
      <Suspense fallback={<div className="bg-gray-800 border border-gray-700 rounded-xl p-6 h-96 flex items-center justify-center text-gray-400">Loading chart...</div>}>
        <BacktesterChart chartData={chartData} selectedLongEx={selectedLongEx} selectedShortEx={selectedShortEx} />
      </Suspense>
    </div>
  );
}
