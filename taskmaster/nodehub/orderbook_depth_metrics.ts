/**
 * Analyze on-chain orderbook depth for a given market
 * Additions:
 * - Timeout + single retry (deterministic)
 * - Safer JSON parsing and URL encoding
 * - Input normalization (positive numbers, sorting)
 * - Defensive math to avoid NaN/Infinity
 */

export interface Order {
  price: number
  size: number
}

export interface DepthMetrics {
  averageBidDepth: number
  averageAskDepth: number
  spread: number
}

type OrderbookResponse = {
  bids?: Order[]
  asks?: Order[]
  ts?: number
}

export class TokenDepthAnalyzer {
  constructor(
    private rpcEndpoint: string,
    private marketId: string,
    private requestTimeoutMs: number = 10_000,
    private maxRetries: number = 1
  ) {}

  private async delay(ms: number): Promise<void> {
    return new Promise(res => setTimeout(res, ms))
  }

  private async fetchJson<T>(url: string): Promise<T> {
    let lastErr: unknown
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), this.requestTimeoutMs)
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
        })
        clearTimeout(timer)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as T
      } catch (e) {
        clearTimeout(timer)
        lastErr = e
        if (attempt < this.maxRetries) await this.delay(200) // fixed backoff
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("fetchJson failed")
  }

  /**
   * Ensure orders are valid and sorted:
   * - bids: descending by price
   * - asks: ascending by price
   */
  private normalize(side: Order[] | undefined, isBid: boolean): Order[] {
    const out: Order[] = []
    const src = Array.isArray(side) ? side : []
    for (let i = 0; i < src.length; i++) {
      const p = Number(src[i]?.price)
      const s = Number(src[i]?.size)
      if (!Number.isFinite(p) || !Number.isFinite(s)) continue
      if (p <= 0 || s <= 0) continue
      out.push({ price: p, size: s })
    }
    out.sort((a, b) => (isBid ? b.price - a.price : a.price - b.price))
    return out
  }

  async fetchOrderbook(depth = 50): Promise<{ bids: Order[]; asks: Order[] }> {
    const url =
      `${this.rpcEndpoint}/orderbook/` +
      `${encodeURIComponent(this.marketId)}?depth=${encodeURIComponent(String(depth))}`
    const raw = await this.fetchJson<OrderbookResponse>(url)
    return {
      bids: this.normalize(raw.bids, true),
      asks: this.normalize(raw.asks, false),
    }
  }

  private avg(sizes: number[]): number {
    if (sizes.length === 0) return 0
    let sum = 0
    for (let i = 0; i < sizes.length; i++) sum += sizes[i]
    return sum / sizes.length
  }

  async analyze(depth = 50): Promise<DepthMetrics> {
    const { bids, asks } = await this.fetchOrderbook(depth)

    const bestBid = bids.length > 0 ? bids[0].price : 0
    const bestAsk = asks.length > 0 ? asks[0].price : 0

    const averageBidDepth = this.avg(bids.map(b => b.size))
    const averageAskDepth = this.avg(asks.map(a => a.size))

    let spread = 0
    if (bestBid > 0 && bestAsk > 0) {
      spread = Math.max(0, bestAsk - bestBid)
    }

    return { averageBidDepth, averageAskDepth, spread }
  }
}
