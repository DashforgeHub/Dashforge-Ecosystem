import fetch from "node-fetch"

/*------------------------------------------------------
 * Types
 *----------------------------------------------------*/

export interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export type CandlestickPattern =
  | "Hammer"
  | "ShootingStar"
  | "BullishEngulfing"
  | "BearishEngulfing"
  | "Doji"

export interface PatternSignal {
  timestamp: number
  pattern: CandlestickPattern
  confidence: number
}

export interface DetectionOptions {
  /** Minimum confidence to emit (default 0.6) */
  minConfidence?: number
  /** If true, include multiple patterns per candle; otherwise pick the best (default false) */
  allowMultiple?: boolean
  /** Per-pattern confidence thresholds (fallback to minConfidence) */
  thresholds?: Partial<Record<CandlestickPattern, number>>
  /** Treat tiny body moves as flat noise (0–1, default 0) */
  epsilon?: number
  /** Sort candles by timestamp asc before processing (default true) */
  sortByTimestamp?: boolean
}

/*------------------------------------------------------
 * Detector
 *----------------------------------------------------*/

export class CandlestickPatternDetector {
  constructor(private readonly apiUrl: string) {}

  /* Fetch recent OHLC candles */
  async fetchCandles(symbol: string, limit = 100): Promise<Candle[]> {
    try {
      const res = await fetch(`${this.apiUrl}/markets/${encodeURIComponent(symbol)}/candles?limit=${limit}`, {
        timeout: 10_000,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`Failed to fetch candles ${res.status}: ${res.statusText} ${text}`.trim())
      }
      const data = (await res.json()) as Candle[]
      // quick sanitize
      return data
        .filter(c => Number.isFinite(c.timestamp) && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
    } catch (err: any) {
      throw new Error(`fetchCandles error: ${err?.message ?? String(err)}`)
    }
  }

  /* ------------------------- Pattern helpers ---------------------- */

  private isHammer(c: Candle, eps = 0): number {
    const body = Math.max(Math.abs(c.close - c.open), eps)
    const lowerWick = Math.min(c.open, c.close) - c.low
    const full = Math.max(c.high - c.low, eps)
    const ratio = lowerWick / body
    return ratio > 2 && body / full < 0.3 ? Math.min(ratio / 3, 1) : 0
  }

  private isShootingStar(c: Candle, eps = 0): number {
    const body = Math.max(Math.abs(c.close - c.open), eps)
    const upperWick = c.high - Math.max(c.open, c.close)
    const full = Math.max(c.high - c.low, eps)
    const ratio = upperWick / body
    return ratio > 2 && body / full < 0.3 ? Math.min(ratio / 3, 1) : 0
  }

  private isBullishEngulfing(prev: Candle, curr: Candle, eps = 0): number {
    const cond =
      curr.close > curr.open &&
      prev.close < prev.open &&
      curr.close >= prev.open - eps &&
      curr.open <= prev.close + eps
    if (!cond) return 0
    const bodyPrev = Math.max(Math.abs(prev.close - prev.open), eps)
    const bodyCurr = Math.abs(curr.close - curr.open)
    return bodyPrev > 0 ? Math.min(bodyCurr / bodyPrev, 1) : 0.8
  }

  private isBearishEngulfing(prev: Candle, curr: Candle, eps = 0): number {
    const cond =
      curr.close < curr.open &&
      prev.close > prev.open &&
      curr.open >= prev.close - eps &&
      curr.close <= prev.open + eps
    if (!cond) return 0
    const bodyPrev = Math.max(Math.abs(prev.close - prev.open), eps)
    const bodyCurr = Math.abs(curr.close - curr.open)
    return bodyPrev > 0 ? Math.min(bodyCurr / bodyPrev, 1) : 0.8
  }

  private isDoji(c: Candle, eps = 0): number {
    const range = Math.max(c.high - c.low, eps)
    const body = Math.abs(c.close - c.open)
    const ratio = body / range
    return ratio < 0.1 ? 1 - ratio * 10 : 0
  }

  /* ------------------------- Public API --------------------------- */

  /**
   * Detect candlestick patterns in a candle series.
   */
  detectPatterns(candles: Candle[], opts: DetectionOptions = {}): PatternSignal[] {
    const {
      minConfidence = 0.6,
      allowMultiple = false,
      thresholds = {},
      epsilon = 0,
      sortByTimestamp = true,
    } = opts

    const arr = sanitizeCandles(candles, sortByTimestamp)
    if (arr.length === 0) return []

    const out: PatternSignal[] = []
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i]
      const prev = i > 0 ? arr[i - 1] : undefined

      const scores: Partial<Record<CandlestickPattern, number>> = {
        Hammer: this.isHammer(c, epsilon),
        ShootingStar: this.isShootingStar(c, epsilon),
        Doji: this.isDoji(c, epsilon),
      }
      if (prev) {
        scores.BullishEngulfing = this.isBullishEngulfing(prev, c, epsilon)
        scores.BearishEngulfing = this.isBearishEngulfing(prev, c, epsilon)
      }

      const candidates: PatternSignal[] = []
      for (const [pattern, score] of Object.entries(scores) as [CandlestickPattern, number][]) {
        const th = thresholds[pattern] ?? minConfidence
        if ((score ?? 0) >= th) {
          candidates.push({
            timestamp: c.timestamp,
            pattern,
            confidence: round3(score),
          })
        }
      }

      if (!candidates.length) continue
      if (allowMultiple) {
        out.push(...candidates)
      } else {
        candidates.sort((a, b) => b.confidence - a.confidence)
        out.push(candidates[0])
      }
    }
    return out
  }
}

/*------------------------------------------------------
 * Helpers
 *----------------------------------------------------*/

function sanitizeCandles(candles: Candle[], sort: boolean): Candle[] {
  const filtered = candles.filter(
    (c) =>
      c &&
      Number.isFinite(c.timestamp) &&
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close)
  )
  if (!sort) return filtered
  return [...filtered].sort((a, b) => a.timestamp - b.timestamp)
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}
