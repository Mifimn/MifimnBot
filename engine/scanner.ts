import { Candle, KeyLevel, SyntheticSymbol, Timeframe, TradeSetup } from "../lib/types";
import { detectKeyLevels } from "./levels";
import { detectLiquiditySweep, detectMarketStructureShift } from "./sweeps";
import { confirmLiveEntry } from "./confirmation";
import { analyzeAMDXPhase } from "./amdx";
import { tradeManager } from "./manager";

/**
 * Main Scanning Engine that evaluates multi-timeframe candles to generate
 * 7.0–10.0 scored setups with >= 1:5 Risk-to-Reward, filters choppy AMDX cycles,
 * confirms live entries, and tracks active trades in memory.
 */
export class AlchemistScanner {
  
  /**
   * Evaluates a symbol's timeframes and outputs valid, high-confluence TradeSetups.
   */
  public evaluateMarket(
    symbol: SyntheticSymbol,
    candlesMap: Record<Timeframe, Candle[]>
  ): TradeSetup | null {
    const h1Candles = candlesMap["1h"] || [];
    const m5Candles = candlesMap["5m"] || [];
    const m1Candles = candlesMap["1m"] || [];

    if (h1Candles.length < 20 || m5Candles.length < 10 || m1Candles.length < 5) {
      return null; // Not enough data loaded yet
    }

    // 1. AMDX Phase & Volatility Filter (Discards low-volume Accumulation chop)
    const amdxStatus = analyzeAMDXPhase(m5Candles);
    if (!amdxStatus.isTradable) {
      return null; 
    }

    // 2. Detect Macro Key Levels on H1 (Storyline & Major Targets)
    const h1Levels = detectKeyLevels(h1Candles, "1h", 4);
    const m5Levels = detectKeyLevels(m5Candles, "5m", 3);
    const activeLevels = [...h1Levels, ...m5Levels];

    // 3. Check current M5/M1 candles for Liquidity Sweeps
    const latestM5 = m5Candles[m5Candles.length - 1];
    const sweepResult = detectLiquiditySweep(latestM5, activeLevels, 0.40);

    if (!sweepResult || !sweepResult.hasSweep) {
      return null; // No sweep detected, no setup
    }

    // 4. Check for Lower Timeframe MSS (Market Structure Shift) confirmation
    const recentM1 = m1Candles.slice(-5);
    const mssResult = detectMarketStructureShift(recentM1, sweepResult);

    // 5. Determine Trade Direction & Setup Parameters
    const isBullish = sweepResult.type === "BULLISH_SWEEP";
    const direction = isBullish ? "BUY" : "SELL";
    const entryPrice = sweepResult.optimalEntryPrice;
    const stopLoss = sweepResult.invalidationLevel;

    // 6. Find Major Macro Target from H1 Levels (To ensure >= 1:5 R:R)
    const targetLevels = h1Levels
      .filter(l => isBullish ? l.price > entryPrice : l.price < entryPrice)
      .map(l => l.price);

    if (targetLevels.length === 0) return null; // No structural target found

    // Pick the best major structural target
    const takeProfit2 = isBullish 
      ? Math.max(...targetLevels) 
      : Math.min(...targetLevels);

    const riskDistance = Math.abs(entryPrice - stopLoss);
    const rewardDistance = Math.abs(takeProfit2 - entryPrice);

    if (riskDistance <= 0) return null;

    const riskToReward = rewardDistance / riskDistance;

    // STRICT FILTER: Drop any setup below 1:5 R:R
    if (riskToReward < 5.0) {
      return null; 
    }

    const takeProfit1 = isBullish 
      ? entryPrice + (riskDistance * 3) // TP1 at 1:3 for partials
      : entryPrice - (riskDistance * 3);

    // 7. Scoring Matrix (7.0 to 10.0 Rating Algorithm)
    let score = 7.0;
    const reasons: string[] = [];

    reasons.push(`HTF Key Level Tap: ${sweepResult.keyLevelTapped.price.toFixed(2)}`);
    reasons.push(`Liquidity Sweep confirmed with ${(sweepResult.wickRatio * 100).toFixed(1)}% rejection wick`);
    reasons.push(`AMDX Cycle: Verified ${amdxStatus.phase} expansion momentum`);

    if (sweepResult.keyLevelTapped.timeframe === "1h") {
      score += 1.0; 
      reasons.push("Higher Timeframe (H1) Structural Anchor");
    }

    if (mssResult.hasMSS) {
      score += 1.0;
      reasons.push(`Micro Market Structure Shift (${mssResult.direction}) confirmed on M1`);
    }

    if (riskToReward >= 10.0) {
      score += 1.0;
      reasons.push(`Elite Risk-to-Reward Ratio achieved (1:${riskToReward.toFixed(1)})`);
    } else {
      score += 0.5;
      reasons.push(`High Risk-to-Reward Ratio achieved (1:${riskToReward.toFixed(1)})`);
    }

    const finalScore = Math.min(score, 10.0);

    // 8. Create the base Trade Setup object
    const setup: TradeSetup = {
      id: `${symbol}_${Date.now()}`,
      symbol,
      direction,
      score: parseFloat(finalScore.toFixed(1)),
      entryPrice: parseFloat(entryPrice.toFixed(3)),
      stopLoss: parseFloat(stopLoss.toFixed(3)),
      takeProfit1: parseFloat(takeProfit1.toFixed(3)),
      takeProfit2: parseFloat(takeProfit2.toFixed(3)),
      riskToReward: parseFloat(riskToReward.toFixed(1)),
      timestamp: Date.now(),
      reason: reasons,
      status: "ACTIVE",
    };

    // 9. Run Live Entry Confirmation
    const latestM1 = m1Candles[m1Candles.length - 1];
    const liveConfirmation = confirmLiveEntry(setup, latestM1, latestM1.close);

    if (liveConfirmation.status === "INVALID_CANCEL") {
      setup.status = "INVALIDATED";
      setup.reason.push(liveConfirmation.message);
      return setup; 
    }

    setup.reason.push(liveConfirmation.message);

    // 10. Register Active Trade into Memory Tracker
    tradeManager.addTrade(setup);

    return setup;
  }
}

export const scanner = new AlchemistScanner();
