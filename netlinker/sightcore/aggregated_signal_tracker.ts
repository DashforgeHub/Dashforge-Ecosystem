import type { SightCoreMessage } from "./WebSocketClient"

export interface AggregatedSignal {
  topic: string
  count: number
  lastPayload: any
  lastTimestamp: number
  firstTimestamp: number
}

export class SignalAggregator {
  private counts: Record<string, AggregatedSignal> = {}

  /**
   * Process an incoming message and update aggregation stats.
   */
  processMessage(msg: SightCoreMessage): AggregatedSignal {
    const { topic, payload, timestamp } = msg
    const entry = this.counts[topic] || {
      topic,
      count: 0,
      lastPayload: null,
      lastTimestamp: 0,
      firstTimestamp: timestamp,
    }

    entry.count += 1
    entry.lastPayload = payload
    entry.lastTimestamp = timestamp

    this.counts[topic] = entry
    return entry
  }

  /**
   * Get aggregated stats for a single topic.
   */
  getAggregated(topic: string): AggregatedSignal | undefined {
    return this.counts[topic]
  }

  /**
   * Get stats for all topics as an array.
   */
  getAllAggregated(): AggregatedSignal[] {
    return Object.values(this.counts)
  }

  /**
   * Get the most active topic based on message count.
   */
  getTopTopic(): AggregatedSignal | null {
    const all = this.getAllAggregated()
    if (all.length === 0) return null
    return all.reduce((max, curr) => (curr.count > max.count ? curr : max), all[0])
  }

  /**
   * Reset all aggregated data.
   */
  reset(): void {
    this.counts = {}
  }
}
