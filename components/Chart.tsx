"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, ISeriesApi, CandlestickData } from "lightweight-charts";
import { Candle, KeyLevel } from "../lib/types";

interface ChartProps {
  data: Candle[];
  levels?: KeyLevel[];
  symbol: string;
}

export default function Chart({ data, levels = [], symbol }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // 1. Initialize Chart ONLY ONCE
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#000000" },
        textColor: "#FFFFFF",
      },
      grid: {
        vertLines: { color: "#222222" },
        horzLines: { color: "#222222" },
      },
      crosshair: {
        mode: 1, 
        vertLine: { color: "#FFFFFF", labelBackgroundColor: "#000000", style: 3 },
        horzLine: { color: "#FFFFFF", labelBackgroundColor: "#000000", style: 3 },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#333333",
      },
      rightPriceScale: {
        borderColor: "#333333",
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#00E676",
      downColor: "#FF3D71",
      borderVisible: false,
      wickUpColor: "#00E676",
      wickDownColor: "#FF3D71",
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []); // <-- EMPTY DEPENDENCY ARRAY: Only runs on mount

  // 2. Update Data Reactively
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      // Ensure data is properly typed for lightweight-charts
      const chartData: CandlestickData[] = data.map((c) => ({
        time: c.time as any, 
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      
      // Update the existing chart instance without destroying it
      seriesRef.current.setData(chartData);

      // Apply key levels if they exist
      levels.forEach((level) => {
        seriesRef.current?.createPriceLine({
          price: level.price,
          color: level.type.includes("RESISTANCE") || level.type === "SBR" ? "#FF3D71" : "#00E676",
          lineWidth: 2,
          lineStyle: 2, 
          axisLabelVisible: true,
          title: level.type.replace("_", " "),
        });
      });
    }
  }, [data, levels]); // <-- Runs safely when data updates

  return (
    <div className="w-full flex flex-col rounded-xl overflow-hidden border border-borderDark bg-black shadow-2xl">
      <div className="px-4 py-3 border-b border-borderDark flex justify-between items-center bg-black">
        <h3 className="text-white font-bold text-lg">
          {symbol.replace("_", " ")} <span className="text-gray-500 text-sm font-normal ml-2">M5 Chart</span>
        </h3>
        
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neonGreen opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neonGreen"></span>
          </span>
          <span className="text-xs text-neonGreen font-semibold tracking-wider uppercase">Live Data</span>
        </div>
      </div>
      
      <div ref={chartContainerRef} className="w-full h-[500px]" />
    </div>
  );
}
