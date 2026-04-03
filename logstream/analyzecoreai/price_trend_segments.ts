export interface PricePoint {
  timestamp: number
  priceUsd: number
}

export interface TrendResult {
  startTime: number
  endTime: number
  trend: "upward" | "downward" | "neutral"
  changePct: number
  duration: number
  startPrice: number
  endPrice: number
}

/**
 * Analyze a series of price points to determine overall trend segments.
 * Includes start/end prices, duration, and percentage change.
 */
export function analyzePriceTrends(
  points: PricePoint[],
  minSegmentLength: number = 5
): TrendResult[] {
  const results: TrendResult[] = []
  if (points.length < minSegmentLength) return results

  let segStart = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].priceUsd
    const curr = points[i].priceUsd
    const direction = curr > prev ? 1 : curr < prev ? -1 : 0

    const directionChange =
      (direction === 1 && points[i + 1]?.priceUsd < curr) ||
      (direction === -1 && points[i + 1]?.priceUsd > curr)

    if (i - segStart >= minSegmentLength && (i === points.length - 1 || directionChange)) {
      const start = points[segStart]
      const end = points[i]
      const changePct = ((end.priceUsd - start.priceUsd) / start.priceUsd) * 100

      results.push({
        startTime: start.timestamp,
        endTime: end.timestamp,
        trend: changePct > 0 ? "upward" : changePct < 0 ? "downward" : "neutral",
        changePct: Math.round(changePct * 100) / 100,
        duration: end.timestamp - start.timestamp,
        startPrice: start.priceUsd,
        endPrice: end.priceUsd,
      })

      segStart = i
    }
  }
  return results
}
