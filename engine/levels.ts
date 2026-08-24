import { Candle, KeyLevel, Timeframe } from "../lib/types";

/**
 * Scans an array of historical candles to find 'A' (Resistance) and 'V' (Support) structures.
 * 
 * @param candles Array of historical OHLC candles
 * @param timeframe The chart timeframe being analyzed
 * @param lookback Number of candles to the left and right to confirm a valid swing
 * @returns Array of valid KeyLevel objects
 */
export function detectKeyLevels(
  candles: Candle[],
  timeframe: Timeframe,
  lookback: number = 3
): KeyLevel[] {
  const levels: KeyLevel[] = [];

  // Need enough candles to form a valid left and right shoulder
  if (candles.length < lookback * 2 + 1) return levels;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i];
    
    let isResistanceA = true;
    let isSupportV = true;

    // Validate the A or V shape against surrounding candles
    for (let j = 1; j <= lookback; j++) {
      const left = candles[i - j];
      const right = candles[i + j];

      // A-Shape Check: Current high must be strictly greater than surrounding highs
      if (left.high >= current.high || right.high >= current.high) {
        isResistanceA = false;
      }

      // V-Shape Check: Current low must be strictly lower than surrounding lows
      if (left.low <= current.low || right.low <= current.low) {
        isSupportV = false;
      }
    }

    if (isResistanceA) {
      levels.push({
        id: `RES_A_${current.time}`,
        price: current.high,
        type: "RESISTANCE_A",
        timeframe,
        timestamp: current.time,
        testedCount: 0,
        isBroken: false,
      });
    }

    if (isSupportV) {
      levels.push({
        id: `SUP_V_${current.time}`,
        price: current.low,
        type: "SUPPORT_V",
        timeframe,
        timestamp: current.time,
        testedCount: 0,
        isBroken: false,
      });
    }
  }

  return levels;
}
