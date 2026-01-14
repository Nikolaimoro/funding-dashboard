"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { COLORS, TAILWIND } from "@/lib/theme";
import { formatExchange } from "@/lib/formatters";
import dynamic from "next/dynamic";
import { Chart as ChartJS, LineController, BarController, LineElement, PointElement, BarElement, LinearScale, TimeScale, Tooltip, Legend, Filler } from "chart.js";
import "chartjs-adapter-date-fns";
import { Chart } from "react-chartjs-2";
import zoomPlugin from "chartjs-plugin-zoom";

ChartJS.register(
  LineController,
  BarController,
  LineElement,
  PointElement,
  BarElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

interface BacktesterChartProps {
  chartData: any;
  selectedLongEx?: string;
  selectedShortEx?: string;
}

export default function BacktesterChart({ chartData, selectedLongEx, selectedShortEx }: BacktesterChartProps) {
  const isLoaded = !!chartData;

  // Mock data for demo - in production this would come from the API
  const mockRefUrls = useMemo(() => {
    if (!isLoaded) return { longUrl: null, shortUrl: null };

    return {
      longUrl: selectedLongEx ? `https://${selectedLongEx.toLowerCase()}.com` : null,
      shortUrl: selectedShortEx ? `https://${selectedShortEx.toLowerCase()}.com` : null,
    };
  }, [isLoaded, selectedLongEx, selectedShortEx]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-200">Funding Rates</h2>

      {!isLoaded ? (
        <div className="h-96 flex items-center justify-center text-gray-500 rounded border border-gray-700">
          <p>Run a backtest to see funding rates as line charts and spread as bars.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chart Container */}
          <div className="border border-gray-700 rounded p-4 bg-gray-900 h-96">
            <p className="text-gray-500 text-center">Chart placeholder - would show funding rates</p>
          </div>

          {/* Exchange Buttons */}
          <div className="flex gap-3 justify-center">
            {mockRefUrls.longUrl && (
              <a
                href={mockRefUrls.longUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition"
              >
                <span className="font-semibold">{formatExchange(selectedLongEx || "")}</span>
                <ExternalLink size={16} />
              </a>
            )}

            {mockRefUrls.shortUrl && (
              <a
                href={mockRefUrls.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition"
              >
                <span className="font-semibold">{formatExchange(selectedShortEx || "")}</span>
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
