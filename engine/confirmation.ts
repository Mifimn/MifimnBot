import { Candle, TradeSetup } from "../lib/types";

export interface EntryConfirmationResult {
  status: "WAITING" | "VALID_ENTRY" | "INVALID_CANCEL";
  message: string;
}

/**
 * Evaluates live price action right as price touches the entry zone
 * to confirm if institutional algorithms are defending it or if it's slicing through.
 */
export function confirmLiveEntry(
  setup: TradeSetup,
  currentCandle: Candle,
  currentTickPrice: number
): EntryConfirmationResult {
  const isBuy = setup.direction === "BUY";
  
  // Define how close price needs to be to consider it a "touch" (e.g., within 0.3 points)
  const entryTolerance = 0.3;
  const distanceToEntry = Math.abs(currentTickPrice - setup.entryPrice);
  const isTouchingEntry = distanceToEntry <= entryTolerance;

  // 1. Check if price completely invalidated the setup by breaking past the stop loss
  if (isBuy && currentTickPrice <= setup.stopLoss) {
    return {
      status: "INVALID_CANCEL",
      message: "❌ ENTRY INVALIDATED: Price broke straight through entry and hit Stop Loss without a defense reaction.",
    };
  }
  if (!isBuy && currentTickPrice >= setup.stopLoss) {
    return {
      status: "INVALID_CANCEL",
      message: "❌ ENTRY INVALIDATED: Price broke straight through entry and rallied past Stop Loss without rejection.",
    };
  }

  // If price hasn't reached the entry zone yet, keep waiting
  if (!isTouchingEntry && currentTickPrice > setup.stopLoss && currentTickPrice < setup.takeProfit2) {
    return {
      status: "WAITING",
      message: "⏳ Waiting for price to tap entry zone...",
    };
  }

  // 2. TAPPED ENTRY: Analyze the Candle's Micro-Reaction (Wick & Closing Strength)
  const totalRange = currentCandle.high - currentCandle.low;
  const bodyLow = Math.min(currentCandle.open, currentCandle.close);
  const bodyHigh = Math.max(currentCandle.open, currentCandle.close);

  if (isBuy) {
    const lowerWick = bodyLow - currentCandle.low;
    const hasRejectionWick = totalRange > 0 && (lowerWick / totalRange) >= 0.35; // At least 35% lower wick
    const closedStrong = currentCandle.close > currentCandle.open; // Green candle body

    if (isTouchingEntry && (hasRejectionWick || closedStrong)) {
      return {
        status: "VALID_ENTRY",
        message: "✅ ENTRY CONFIRMED: Institutional buyers defended the support level with a rejection wick. Safe to execute!",
      };
    }
  } else {
    const upperWick = currentCandle.high - bodyHigh;
    const hasRejectionWick = totalRange > 0 && (upperWick / totalRange) >= 0.35; // At least 35% upper wick
    const closedStrong = currentCandle.close < currentCandle.open; // Red candle body

    if (isTouchingEntry && (hasRejectionWick || closedStrong)) {
      return {
        status: "VALID_ENTRY",
        message: "✅ ENTRY CONFIRMED: Institutional sellers rejected the resistance level with an upper wick. Safe to execute!",
      };
    }
  }

  return {
    status: "WAITING",
    message: "⚠️ Price is touching entry, but waiting for candle close / rejection confirmation...",
  };
}
