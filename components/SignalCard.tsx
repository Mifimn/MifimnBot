"use client";

import { motion } from "framer-motion";
import { Target, ShieldAlert, TrendingUp, TrendingDown, Zap, CheckCircle2, Clock } from "lucide-react";
import { TradeSetup } from "../lib/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SignalCardProps {
  setup: TradeSetup;
}

export default function SignalCard({ setup }: SignalCardProps) {
  const isBuy = setup.direction === "BUY";
  
  // Determine border and glow colors based on direction and status
  const themeColor = isBuy ? "text-neonGreen" : "text-neonRed";
  const bgTheme = isBuy ? "bg-neonGreen/10" : "bg-neonRed/10";
  const borderTheme = isBuy ? "border-neonGreen/30" : "border-neonRed/30";

  // Check if live confirmation says "VALID_ENTRY"
  const isValidEntry = setup.reason.some(r => r.includes("✅ ENTRY CONFIRMED"));
  const isWaiting = setup.reason.some(r => r.includes("⏳ Waiting"));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "relative overflow-hidden rounded-xl bg-cardBg border p-5 shadow-xl transition-all",
        borderTheme
      )}
    >
      {/* Top Header: Symbol & Direction */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {setup.symbol.replace("_", " ")}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-md", bgTheme, themeColor)}>
              {isBuy ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {setup.direction}
            </span>
            <span className="text-xs text-gray-400 font-medium">
              Score: <strong className="text-white">{setup.score}/10</strong>
            </span>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex flex-col items-end">
          {isValidEntry ? (
            <span className="flex items-center gap-1 text-xs font-bold text-neonGreen bg-neonGreen/20 px-2 py-1 rounded animate-pulse">
              <CheckCircle2 size={14} /> VALID ENTRY
            </span>
          ) : isWaiting ? (
            <span className="flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-400/20 px-2 py-1 rounded">
              <Clock size={14} /> WAITING
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-gray-400 bg-gray-800 px-2 py-1 rounded">
              {setup.status}
            </span>
          )}
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-darkBg rounded-lg p-3 border border-borderDark">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Zap size={12} /> Entry Zone
          </p>
          <p className="text-lg font-mono font-semibold text-white">
            {setup.entryPrice.toFixed(3)}
          </p>
        </div>
        <div className="bg-darkBg rounded-lg p-3 border border-borderDark">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <ShieldAlert size={12} className="text-red-400" /> Stop Loss
          </p>
          <p className="text-lg font-mono font-semibold text-red-400">
            {setup.stopLoss.toFixed(3)}
          </p>
        </div>
        <div className="bg-darkBg rounded-lg p-3 border border-borderDark col-span-2 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Target size={12} className="text-neonGreen" /> Take Profit (TP2)
            </p>
            <p className="text-lg font-mono font-semibold text-neonGreen">
              {setup.takeProfit2.toFixed(3)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">R:R Ratio</p>
            <p className="text-sm font-bold text-white">1:{setup.riskToReward}</p>
          </div>
        </div>
      </div>

      {/* Confluence Reasons List */}
      <div className="border-t border-borderDark pt-3">
        <p className="text-xs font-semibold text-gray-400 mb-2">Confluence Checklist:</p>
        <ul className="space-y-1.5">
          {setup.reason.map((reason, idx) => (
            <li key={idx} className="text-xs text-gray-300 flex items-start gap-1.5">
              <span className="text-neonGreen mt-0.5">•</span>
              <span className="leading-tight">{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
