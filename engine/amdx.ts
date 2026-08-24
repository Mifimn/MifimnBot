import { Candle } from "../lib/types";

export interface AMDXStatus {
  isTradable: boolean;
  phase: "ACCUMULATION" | "EXPANSION";
  currentVolatility: number;
  baselineVolatility: number;
}

/**
 * Filters out Accumulation (choppy, sideways) phases by measuring recent volatility 
 * against a historical baseline to ensure the market is expanding.
 */
export function analyzeAMDXPhase(recentCandles: Candle[], lookback: number = 14): AMDXStatus {
  if (recentCandles.length < lookback * 2) {
    return { isTradable: true, phase: "EXPANSION", currentVolatility: 0, baselineVolatility: 0 };
  }

  // Calculate the average candle size (High - Low) for the historical baseline
  const baselineCandles = recentCandles.slice(-(lookback * 2), -lookback);
  let totalBaselineRange = 0;
  for (const c of baselineCandles) {
    totalBaselineRange += (c.high - c.low);
  }
  const baselineVolatility = totalBaselineRange / lookback;

  // Calculate the average candle size for the immediate recent price action
  const currentCandles = recentCandles.slice(-lookback);
  let totalCurrentRange = 0;
  for (const c of currentCandles) {
    totalCurrentRange += (c.high - c.low);
  }
  const currentVolatility = totalCurrentRange / lookback;

  // If current volatility is tightly compressed (less than 70% of the baseline), it's Accumulation
  const isAccumulation = currentVolatility < (baselineVolatility * 0.70);

  return {
    isTradable: !isAccumulation,
    phase: isAccumulation ? "ACCUMULATION" : "EXPANSION",
    currentVolatility: parseFloat(currentVolatility.toFixed(3)),
    baselineVolatility: parseFloat(baselineVolatility.toFixed(3)),
  };
}
