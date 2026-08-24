"use client";

import { useEffect, useState } from "react";
import { derivAPI } from "../lib/deriv";
import { scanner } from "../engine/scanner";
import { Candle, TradeSetup } from "../lib/types";
import Chart from "../components/Chart";
import SignalCard from "../components/SignalCard";
import { Activity, AlertOctagon } from "lucide-react";

export default function Dashboard() {
  const [m5Candles, setM5Candles] = useState<Candle[]>([]);
  const [activeSetups, setActiveSetups] = useState<TradeSetup[]>([]);
  
  // NEW: State to store and display errors on the screen
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Listen for API Errors and display them on screen
    derivAPI.onError((msg) => {
      setErrorMessage(msg);
    });

    // 2. Load Historical Data
    derivAPI.onHistory((symbol, tf, data) => {
      // Clear error if data arrives successfully
      setErrorMessage(null); 
      if (data && data.length > 0) {
        setM5Candles(data);
      }
    });

    // 3. Listen for Live Ticks
    derivAPI.onLiveUpdate((symbol, tf, liveCandle) => {
      setM5Candles((prev) => {
        if (prev.length === 0) return [liveCandle];
        const updated = [...prev];
        const lastCandle = updated[updated.length - 1];
        
        if (lastCandle.time === liveCandle.time) {
          updated[updated.length - 1] = liveCandle;
        } else {
          updated.push(liveCandle);
        }
        
        if (updated.length > 1000) updated.shift();
        return updated;
      });
    });

    derivAPI.subscribeCandles("R_100", "5m", 500);
  }, []);

  // Scanner Effect
  useEffect(() => {
    if (m5Candles.length > 0) {
      const dummyMap = { "1h": [], "5m": m5Candles, "1m": [], "15m": [], "30m": [], "4h": [] };
      const setup = scanner.evaluateMarket("R_100", dummyMap);
      
      if (setup) {
        setActiveSetups((prev) => {
          if (prev.find((s) => s.id === setup.id)) return prev;
          return [setup, ...prev];
        });
      }
    }
  }, [m5Candles]);

  const triggerTestSignal = () => {
    const mockSetup: TradeSetup = {
      id: `TEST_${Date.now()}`,
      symbol: "R_100",
      direction: "BUY",
      score: 9.5,
      entryPrice: 4850.25,
      stopLoss: 4840.00,
      takeProfit1: 4881.00,
      takeProfit2: 4952.75,
      riskToReward: 10.0,
      timestamp: Date.now(),
      reason: [
        "Higher Timeframe (H1) Structural Anchor",
        "Bullish Liquidity Sweep",
      ],
      status: "ACTIVE"
    };
    setActiveSetups((prev) => [mockSetup, ...prev]);
  };

  return (
    <main className="max-w-[1600px] mx-auto p-4 md:p-6">
      
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Activity className="text-neonGreen" size={32} />
            Alchemist Engine
          </h1>
          <p className="text-gray-400 mt-1">Live SMC & Mitigation Scanner</p>
        </div>
        
        <button 
          onClick={triggerTestSignal}
          className="bg-black border border-borderDark text-xs font-bold px-4 py-2 rounded-lg hover:border-neonGreen transition-colors text-white"
        >
          Simulate Signal
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2">
          {/* ERROR DISPLAY Logic */}
          {errorMessage ? (
            <div className="w-full h-[500px] bg-[#1a0505] border border-red-500/50 rounded-xl flex flex-col items-center justify-center p-8 text-center shadow-[0_0_30px_rgba(255,0,0,0.1)]">
              <AlertOctagon size={48} className="text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-red-400 mb-2">Connection Failed</h2>
              <p className="text-red-200 font-mono text-sm bg-black/50 p-4 rounded-lg w-full max-w-lg border border-red-900/50">
                {errorMessage}
              </p>
              <p className="text-gray-500 text-xs mt-6">
                Note: Ensure your Deriv App ID is a numeric ID (e.g. 1089), not an API Token.
              </p>
            </div>
          ) : m5Candles.length > 0 ? (
            <Chart data={m5Candles} symbol="R_100" levels={[]} />
          ) : (
            <div className="w-full h-[500px] bg-black border border-borderDark rounded-xl flex items-center justify-center">
              <span className="flex items-center gap-3 text-gray-500">
                <span className="animate-spin h-5 w-5 border-2 border-neonGreen border-t-transparent rounded-full"></span>
                Connecting to Deriv WebSocket...
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
          <h3 className="text-white font-bold text-sm sticky top-0 bg-black pb-2 z-10 border-b border-borderDark mb-3">
            ACTIVE ALERTS ({activeSetups.length})
          </h3>
          
          {activeSetups.length === 0 ? (
            <div className="bg-black border border-dashed border-borderDark rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">Scanning for high-probability setups...</p>
            </div>
          ) : (
            activeSetups.map((setup) => (
              <SignalCard key={setup.id} setup={setup} />
            ))
          )}
        </div>

      </div>
    </main>
  );
}
