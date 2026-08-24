export type SyntheticSymbol = "R_10" | "R_75" | "R_100";
export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h";

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface KeyLevel {
  id: string;
  price: number;
  type: "RESISTANCE_A" | "SUPPORT_V" | "SBR" | "RBS";
  timeframe: Timeframe;
  timestamp: number;
  testedCount: number;
  isBroken: boolean;
}

export interface TradeSetup {
  id: string;
  symbol: SyntheticSymbol;
  direction: "BUY" | "SELL";
  score: number; // Rating from 7.0 to 10.0
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskToReward: number; // Filtered to be >= 5.0 (1:5)
  timestamp: number;
  reason: string[];
  status: "ACTIVE" | "INVALIDATED" | "TARGET_HIT";
}

export interface DerivCandleResponse {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
