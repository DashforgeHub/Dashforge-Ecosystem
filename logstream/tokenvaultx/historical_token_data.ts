export interface TokenDataPoint {
  timestamp: number
  priceUsd: number
  volumeUsd: number
  marketCapUsd: number
  liquidityUsd?: number
}

export class TokenDataFetcher {
  constructor(private apiBase: string) {}

  /**
   * Fetches an array of TokenDataPoint for the given token symbol.
   * Expects endpoint: `${apiBase}/tokens/${symbol}/history`
   */
  async fetchHistory(symbol: string): Promise<TokenDataPoint[]> {
    const url = `${this.apiBase}/tokens/${encodeURIComponent(symbol)}/history`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Failed to fetch history for ${symbol}: ${res.status}`)
    }

    const raw = (await res.json()) as any[]
    return raw.map(r => ({
      timestamp: r.time * 1000,
      priceUsd: Number(r.priceUsd),
      volumeUsd: Number(r.volumeUsd),
      marketCapUsd: Number(r.marketCapUsd),
      liquidityUsd: r.liquidityUsd !== undefined ? Number(r.liquidityUsd) : undefined,
    }))
  }

  /**
   * Fetches the latest single datapoint for quick updates.
   */
  async fetchLatest(symbol: string): Promise<TokenDataPoint | null> {
    const history = await this.fetchHistory(symbol)
    return history.length > 0 ? history[history.length - 1] : null
  }
}
