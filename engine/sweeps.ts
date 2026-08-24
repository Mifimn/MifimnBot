import { Candle, KeyLevel } from "../lib/types";

export interface SweepDetectionResult {
  hasSweep: boolean;
  type: "BEARISH_SWEEP" | "BULLISH_SWEEP" | "NONE";
  sweepCandle: Candle;
  keyLevelTapped: KeyLevel;
  wickRatio: number; // Ratio of rejection wick to total candle range (0 to 1)
  invalidationLevel: number; // The exact wick extreme for placing tight SL
  optimalEntryPrice: number; // 50% wick retracement / close entry
  reason: string;
}

export interface MSSDetectionResult {
  hasMSS: boolean;
  direction: "BULLISH_MSS" | "BEARISH_MSS" | "NONE";
  breakPrice: number;
  triggerCandle: Candle;
}

/**
 * Validates whether the current or recent candle performed an institutional liquidity sweep on a Key Level.
 * 
 * @param candle The candle being evaluated
 * @param keyLevels List of active structural key levels
 * @param minWickRatio Minimum wick-to-candle-range ratio required (default 0.40 / 40%)
 */
export function detectLiquiditySweep(
  candle: Candle,
  keyLevels: KeyLevel[],
  minWickRatio: number = 0.40
): SweepDetectionResult | null {
  const totalRange = candle.high - candle.low;
  if (totalRange <= 0) return null;

  const bodyHigh = Math.max(candle.open, candle.close);
  const bodyLow = Math.min(candle.open, candle.close);

  const upperWick = candle.high - bodyHigh;
  const lowerWick = bodyLow - candle.low;

  const upperWickRatio = upperWick / totalRange;
  const lowerWickRatio = lowerWick / totalRange;

  for (const level of keyLevels) {
    // 1. BEARISH LIQUIDITY SWEEP (Resistance / A-Shape / SBR)
    // Price spikes above level, but candle body closes strictly BELOW the level with a prominent upper wick.
    if (
      level.type === "RESISTANCE_A" ||
      level.type === "SBR"
    ) {
      const spikedAbove = candle.high > level.price;
      const closedBelow = bodyHigh <= level.price;
      const strongUpperWick = upperWickRatio >= minWickRatio;

      if (spikedAbove && closedBelow && strongUpperWick) {
        return {
          hasSweep: true,
          type: "BEARISH_SWEEP",
          sweepCandle: candle,
          keyLevelTapped: level,
          wickRatio: upperWickRatio,
          invalidationLevel: candle.high, // Stop Loss goes just above this peak
          optimalEntryPrice: candle.high - (upperWick * 0.5), // 50% Wick Retracement
          reason: `Bearish Liquidity Sweep at ${level.price.toFixed(3)} with ${(upperWickRatio * 100).toFixed(1)}% rejection wick`,
        };
      }
    }

    // 2. BULLISH LIQUIDITY SWEEP (Support / V-Shape / RBS)
    // Price spikes below level, but candle body closes strictly ABOVE the level with a prominent lower wick.
    if (
      level.type === "SUPPORT_V" ||
      level.type === "RBS"
    ) {
      const spikedBelow = candle.low < level.price;
      const closedAbove = bodyLow >= level.price;
      const strongLowerWick = lowerWickRatio >= minWickRatio;

      if (spikedBelow && closedAbove && strongLowerWick) {
        return {
          hasSweep: true,
          type: "BULLISH_SWEEP",
          sweepCandle: candle,
          keyLevelTapped: level,
          wickRatio: lowerWickRatio,
          invalidationLevel: candle.low, // Stop Loss goes just below this floor
          optimalEntryPrice: candle.low + (lowerWick * 0.5), // 50% Wick Retracement
          reason: `Bullish Liquidity Sweep at ${level.price.toFixed(3)} with ${(lowerWickRatio * 100).toFixed(1)}% rejection wick`,
        };
      }
    }
  }

  return null;
}

/**
 * Checks for a Market Structure Shift (MSS) on lower timeframes following a sweep.
 * 
 * @param recentCandles Slice of the last 5 to 10 candles
 * @param sweepResult The sweep event that preceded this check
 */
export function detectMarketStructureShift(
  recentCandles: Candle[],
  sweepResult: SweepDetectionResult
): MSSDetectionResult {
  if (recentCandles.length < 2) {
    return { hasMSS: false, direction: "NONE", breakPrice: 0, triggerCandle: recentCandles[0] };
  }

  const latestCandle = recentCandles[recentCandles.length - 1];

  // Bearish MSS: Price closes below the low of the candle that initiated the sweep
  if (sweepResult.type === "BEARISH_SWEEP") {
    const sweepCandleLow = sweepResult.sweepCandle.low;
    if (latestCandle.close < sweepCandleLow) {
      return {
        hasMSS: true,
        direction: "BEARISH_MSS",
        breakPrice: sweepCandleLow,
        triggerCandle: latestCandle,
      };
    }
  }

  // Bullish MSS: Price closes above the high of the candle that initiated the sweep
  if (sweepResult.type === "BULLISH_SWEEP") {
    const sweepCandleHigh = sweepResult.sweepCandle.high;
    if (latestCandle.close > sweepCandleHigh) {
      return {
        hasMSS: true,
        direction: "BULLISH_MSS",
        breakPrice: sweepCandleHigh,
        triggerCandle: latestCandle,
      };
    }
  }

  return { hasMSS: false, direction: "NONE", breakPrice: 0, triggerCandle: latestCandle };
}
