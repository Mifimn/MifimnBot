import { Candle, DerivCandleResponse, SyntheticSymbol, Timeframe } from "./types";

const DERIV_APP_ID = "34cFCevgs4b2NP5o73iMx";
const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

const TIMEFRAME_TO_GRANULARITY: Record<Timeframe, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
};

class DerivAPIClient {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private pendingRequests: (() => void)[] = [];
  
  // NEW: Save the last request so we can resubscribe if the connection drops!
  private currentSubscription: any = null;

  private onHistoryCallback: ((symbol: SyntheticSymbol, tf: Timeframe, candles: Candle[]) => void) | null = null;
  private onLiveUpdateCallback: ((symbol: SyntheticSymbol, tf: Timeframe, candle: Candle) => void) | null = null;
  private onErrorCallback: ((errorMsg: string) => void) | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.connect();
    }
  }

  private connect() {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    this.isConnecting = true;
    console.log("🟡 Connecting to Deriv WebSocket...");

    try {
      this.ws = new WebSocket(WS_URL);
    } catch (err: any) {
      this.dispatchError(`Failed to initialize WebSocket: ${err.message}`);
      this.isConnecting = false;
      return;
    }

    this.ws.onopen = () => {
      this.isConnecting = false;
      console.log("🟢 Deriv WebSocket Connected!");
      
      // 1. Process any pending requests
      this.pendingRequests.forEach((req) => req());
      this.pendingRequests = [];

      // 2. AUTO-RESUBSCRIBE if we just recovered from a disconnected state
      if (this.currentSubscription) {
        console.log("🔄 Re-subscribing after connection drop...");
        this.ws?.send(JSON.stringify(this.currentSubscription));
      }
    };

    this.ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);

        if (data.error) {
          this.dispatchError(`Deriv API Error [${data.error.code}]: ${data.error.message}`);
          return;
        }

        if (data.msg_type === "candles" && data.candles) {
          const symbol = data.echo_req.ticks_history as SyntheticSymbol;
          const granularity = data.echo_req.granularity;
          const tf = this.getTfFromGranularity(granularity);

          const parsedCandles: Candle[] = data.candles.map((c: DerivCandleResponse) => ({
            time: c.epoch,
            open: parseFloat(c.open as any),
            high: parseFloat(c.high as any),
            low: parseFloat(c.low as any),
            close: parseFloat(c.close as any),
          }));

          if (this.onHistoryCallback && tf) {
            this.onHistoryCallback(symbol, tf, parsedCandles);
          }
        }

        if (data.msg_type === "ohlc" && data.ohlc) {
          const symbol = (data.ohlc.symbol || data.echo_req?.ticks_history || "R_100") as SyntheticSymbol;
          const granularity = (data.ohlc.granularity || data.echo_req?.granularity || 300);
          const tf = this.getTfFromGranularity(granularity);

          const rawData = data.ohlc;
          const liveCandle: Candle = {
            time: rawData.open_time,
            open: parseFloat(rawData.open),
            high: parseFloat(rawData.high),
            low: parseFloat(rawData.low),
            close: parseFloat(rawData.close),
          };

          if (this.onLiveUpdateCallback && tf) {
            this.onLiveUpdateCallback(symbol, tf, liveCandle);
          }
        }
      } catch (error: any) {
        this.dispatchError(`Failed to parse WS message: ${error.message}`);
      }
    };

    this.ws.onerror = () => {
      this.dispatchError(`Network connection error. Cannot reach: ${WS_URL}`);
    };

    this.ws.onclose = (event) => {
      this.isConnecting = false;
      this.ws = null;
      
      console.log(`🔴 Deriv WebSocket Disconnected (Code: ${event.code}). Reconnecting in 3s...`);
      setTimeout(() => this.connect(), 3000);
    };
  }

  private dispatchError(msg: string) {
    console.error(`🔴 ${msg}`);
    if (this.onErrorCallback) {
      this.onErrorCallback(msg);
    }
  }

  public subscribeCandles(symbol: SyntheticSymbol, timeframe: Timeframe, count: number = 500) {
    // 1. Build the exact request Deriv needs
    const request = {
      ticks_history: symbol,
      adjust_start_time: 1,
      count: count,
      end: "latest",
      style: "candles",
      granularity: TIMEFRAME_TO_GRANULARITY[timeframe],
      subscribe: 1, 
    };

    // 2. Save it in memory so we can auto-resubscribe later if needed
    this.currentSubscription = request;

    const executeSubscription = () => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      console.log("📤 Sending subscription request:", request);
      this.ws.send(JSON.stringify(request));
    };

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (!this.ws && !this.isConnecting) this.connect();
      this.pendingRequests.push(executeSubscription);
    } else {
      executeSubscription();
    }
  }

  public onHistory(cb: (symbol: SyntheticSymbol, tf: Timeframe, candles: Candle[]) => void) {
    this.onHistoryCallback = cb;
  }

  public onLiveUpdate(cb: (symbol: SyntheticSymbol, tf: Timeframe, candle: Candle) => void) {
    this.onLiveUpdateCallback = cb;
  }

  public onError(cb: (errorMsg: string) => void) {
    this.onErrorCallback = cb;
  }

  private getTfFromGranularity(granularity: number): Timeframe | undefined {
    return Object.keys(TIMEFRAME_TO_GRANULARITY).find(
      (key) => TIMEFRAME_TO_GRANULARITY[key as Timeframe] === granularity
    ) as Timeframe;
  }
}

export const derivAPI = new DerivAPIClient();
