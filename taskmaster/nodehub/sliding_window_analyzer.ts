/**
 * Detect volume-based patterns in a series of activity amounts
 * Enhancements:
 * - Defensive input validation
 * - Handles empty arrays and bad params safely
 * - Adds standard deviation for each window
 * - Returns both threshold matches and all scanned windows
 */

export interface PatternMatch {
  index: number
  window: number
  average: number
  stdDev: number
}

export interface PatternResult {
  matches: PatternMatch[]
  totalWindows: number
  evaluated: boolean
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0
  let sum = 0
  for (let i = 0; i < values.length; i++) sum += values[i]
  return sum / values.length
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0
  let sumSq = 0
  for (let i = 0; i < values.length; i++) {
    const diff = values[i] - mean
    sumSq += diff * diff
  }
  return Math.sqrt(sumSq / values.length)
}

export function detectVolumePatterns(
  volumes: number[],
  windowSize: number,
  threshold: number
): PatternResult {
  const matches: PatternMatch[] = []

  if (!Array.isArray(volumes) || volumes.length === 0) {
    return { matches, totalWindows: 0, evaluated: false }
  }
  if (windowSize <= 0 || threshold < 0) {
    throw new Error("Invalid parameters: windowSize must be > 0 and threshold >= 0")
  }

  for (let i = 0; i + windowSize <= volumes.length; i++) {
    const slice = volumes.slice(i, i + windowSize)
    const avg = calculateAverage(slice)
    const stdDev = calculateStdDev(slice, avg)
    if (avg >= threshold) {
      matches.push({ index: i, window: windowSize, average: avg, stdDev })
    }
  }

  return {
    matches,
    totalWindows: Math.max(0, volumes.length - windowSize + 1),
    evaluated: true,
  }
}
