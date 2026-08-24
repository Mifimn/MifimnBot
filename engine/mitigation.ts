import { Candle, TradeSetup } from "../lib/types";

export interface MitigationAnalysis {
  willRetrace: boolean;
  confidenceScore: number; // Scale of 1 to 10
  mitigationTarget: number; // The OB or FVG price level where price will likely reverse back to
  invalidationLevel: number; // The line past which mitigation fails (cut loss immediately)
  reason: string[];
}

/**
 * Analyzes an active trade in drawdown to determine if price will mitigate
 * an Order Block or FVG and return to entry/breakeven.
 */
export function analyzeTradeMitigation(
  activeTrade: TradeSetup,
  currentPrice: number,
  candles: Candle[]
): MitigationAnalysis {
  const isBuy = activeTrade.direction === "BUY";
  const isInDrawdown = isBuy 
    ? currentPrice < activeTrade.entryPrice 
    : currentPrice > activeTrade.entryPrice;

  if (!isInDrawdown) {
    return {
      willRetrace: true,
      confidenceScore: 10,
      mitigationTarget: activeTrade.entryPrice,
      invalidationLevel: activeTrade.stopLoss,
      reason: ["Trade is currently in profit or at entry."],
    };
  }

  const reasons: string[] = [];
  let confidence = 5.0;
  let mitigationTarget = activeTrade.entryPrice;
  let invalidationLevel = activeTrade.stopLoss;

  // 1. SCAN FOR UNMITIGATED ORDER BLOCKS & FVGs IN THE DIRECTION OF ENTRY
  if (isBuy) {
    // For a BUY trade that dropped: Look left for the last opposing red candle (Bearish OB before drop) 
    // or bullish order block that created support below current price.
    let foundOB = false;
    
    for (let i = candles.length - 2; i >= 5; i--) {
      const c = candles[i];
      const isRed = c.close < c.open;

      // Found a potential bullish order block origin below current price
      if (isRed && c.low <= activeTrade.entryPrice && c.low >= currentPrice) {
        mitigationTarget = c.open; // Target the open/midpoint of the OB
        foundOB = true;
        confidence += 2.0;
        reasons.push(`Unmitigated Bullish Order Block found at ${c.open.toFixed(3)} acting as a bounce magnet.`);
        break;
      }
    }

    if (!foundOB) {
      confidence -= 2.0;
      reasons.push("No clean Order Block found immediately below current price. High risk of extended drop.");
    }

    // Set invalidation level below recent swing low
    const recentLow = Math.min(...candles.slice(-10).map(c => c.low));
    invalidationLevel = recentLow - 0.5;

  } else {
    // For a SELL trade that rallied: Look left for the last green candle before the rally (Bullish OB)
    let foundOB = false;

    for (let i = candles.length - 2; i >= 5; i--) {
      const c = candles[i];
      const isGreen = c.close > c.open;

      if (isGreen && c.high >= activeTrade.entryPrice && c.high <= currentPrice) {
        mitigationTarget = c.open;
        foundOB = true;
        confidence += 2.0;
        reasons.push(`Unmitigated Bearish Order Block found at ${c.open.toFixed(3)} acting as a resistance magnet.`);
        break;
      }
    }

    if (!foundOB) {
      confidence -= 2.0;
      reasons.push("No clean Order Block found immediately above current price. High risk of extended rally.");
    }

    const recentHigh = Math.max(...candles.slice(-10).map(c => c.high));
    invalidationLevel = recentHigh + 0.5;
  }

  const clampedConfidence = Math.max(1.0, Math.min(10.0, confidence));
  const willRetrace = clampedConfidence >= 6.0;

  return {
    willRetrace,
    confidenceScore: parseFloat(clampedConfidence.toFixed(1)),
    mitigationTarget: parseFloat(mitigationTarget.toFixed(3)),
    invalidationLevel: parseFloat(invalidationLevel.toFixed(3)),
    reason: reasons,
  };
}
