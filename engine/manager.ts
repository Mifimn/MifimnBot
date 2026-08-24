import { TradeSetup } from "../lib/types";

export class ActiveTradeManager {
  private activeTrades: Map<string, TradeSetup> = new Map();

  /**
   * Registers a new valid trade setup into memory for live tracking.
   */
  public addTrade(setup: TradeSetup) {
    if (setup.status === "ACTIVE") {
      this.activeTrades.set(setup.id, setup);
      console.log(`🟢 Trade Tracked: ${setup.symbol} ${setup.direction} | Entry: ${setup.entryPrice}`);
    }
  }

  /**
   * Evaluates every live tick against active trades to manage risk and lock in profits.
   */
  public processLiveTick(symbol: string, currentPrice: number) {
    this.activeTrades.forEach((trade, id) => {
      if (trade.symbol !== symbol || trade.status !== "ACTIVE") return;

      const isBuy = trade.direction === "BUY";

      // 1. HARD STOP LOSS HIT
      if ((isBuy && currentPrice <= trade.stopLoss) || (!isBuy && currentPrice >= trade.stopLoss)) {
        trade.status = "INVALIDATED";
        trade.reason.push(`❌ Stop Loss hit at ${currentPrice.toFixed(3)}.`);
        this.activeTrades.delete(id);
        return;
      }

      // 2. FULL TAKE PROFIT (TP2) HIT
      if ((isBuy && currentPrice >= trade.takeProfit2) || (!isBuy && currentPrice <= trade.takeProfit2)) {
        trade.status = "TARGET_HIT";
        trade.reason.push(`🎯 Massive 1:${trade.riskToReward} Target Hit at ${currentPrice.toFixed(3)}!`);
        this.activeTrades.delete(id);
        return;
      }

      // 3. BREAKEVEN TRIGGER (Price reaches TP1)
      const hitTP1 = isBuy ? currentPrice >= trade.takeProfit1 : currentPrice <= trade.takeProfit1;
      const notAtBreakeven = trade.stopLoss !== trade.entryPrice;

      if (hitTP1 && notAtBreakeven) {
        trade.stopLoss = trade.entryPrice;
        trade.reason.push(`🛡️ TP1 Reached. Stop Loss moved to Breakeven (${trade.entryPrice.toFixed(3)}). Risk is $0.00.`);
      }

      // 4. TRAILING STOP (When price moves halfway between TP1 and TP2)
      const halfwayToTP2 = trade.entryPrice + ((trade.takeProfit2 - trade.entryPrice) * 0.65);
      const hitHalfway = isBuy ? currentPrice >= halfwayToTP2 : currentPrice <= halfwayToTP2;
      const notTrailedToTP1 = trade.stopLoss !== trade.takeProfit1;

      if (hitHalfway && notTrailedToTP1) {
        trade.stopLoss = trade.takeProfit1;
        trade.reason.push(`📈 Momentum strong. Stop Loss trailed to TP1 (${trade.takeProfit1.toFixed(3)}) to lock in profit.`);
      }
    });
  }

  public getActiveTrades(): TradeSetup[] {
    return Array.from(this.activeTrades.values());
  }
}

export const tradeManager = new ActiveTradeManager();
