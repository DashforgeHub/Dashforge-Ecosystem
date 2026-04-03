/**
 * Analyze on-chain SPL token activity: fetch recent signatures for an address,
 * load transactions via Solana JSON-RPC, and summarize balance deltas
 *
 * Notes
 * - Uses real Solana JSON-RPC (POST), not path-style endpoints
 * - Pairs pre/post token balances by accountIndex for accurate deltas
 * - Filters to the provided mint (when available in a tx)
 * - Adds retries, timeouts, and basic commitment handling
 */

export interface ActivityRecord {
  timestamp: number
  signature: string
  source: string | null
  destination: string | null
  amount: number
  mint: string
  slot: number
  err: string | null
  confirmationStatus?: "processed" | "confirmed" | "finalized"
}

interface JsonRpcResponse<T> {
  jsonrpc: "2.0"
  id: number | string
  result?: T
  error?: { code: number; message: string }
}

type Commitment = "processed" | "confirmed" | "finalized"

interface GetSignaturesOpts {
  limit?: number
  commitment?: Commitment
  until?: string
}

interface SignatureInfo {
  signature: string
  slot: number
  err: unknown | null
  blockTime: number | null
  confirmationStatus?: "processed" | "confirmed" | "finalized"
}

interface GetTransactionConfig {
  maxSupportedTransactionVersion?: number
  commitment?: Commitment
}

interface UiTokenAmount {
  amount: string
  decimals: number
  uiAmount: number | null
  uiAmountString?: string
}

interface TokenBalanceEntry {
  accountIndex: number
  mint: string
  owner?: string
  uiTokenAmount: UiTokenAmount
}

interface TransactionMeta {
  slot?: number
  err: unknown | null
  preTokenBalances?: TokenBalanceEntry[]
  postTokenBalances?: TokenBalanceEntry[]
}

interface ParsedTransaction {
  slot: number
  blockTime: number | null
  meta: TransactionMeta | null
}

export class TokenActivityAnalyzer {
  constructor(
    private rpcEndpoint: string,
    private commitment: Commitment = "confirmed",
    private requestTimeoutMs: number = 15_000,
    private maxRetries: number = 2
  ) {}

  /**
   * Core JSON-RPC POST helper with timeout and small retry loop
   */
  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    let lastErr: unknown
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs)
      try {
        const res = await fetch(this.rpcEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
          signal: controller.signal,
        })
        clearTimeout(timer)
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${method}`)
        const json = (await res.json()) as JsonRpcResponse<T>
        if (json.error) throw new Error(`${json.error.code}: ${json.error.message}`)
        if (json.result === undefined) throw new Error(`Empty result for ${method}`)
        return json.result
      } catch (err) {
        clearTimeout(timer)
        lastErr = err
        if (attempt === this.maxRetries) break
        // brief backoff without randomness
        await this.fixedDelay(200 * (attempt + 1))
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("RPC request failed")
  }

  private async fixedDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Fetch recent signatures for a given address (e.g., token account, market address, mint)
   * Tip: For rich transfer history, pass an active token account or program-derived address
   */
  async fetchRecentSignatures(address: string, limit = 100, until?: string): Promise<SignatureInfo[]> {
    const opts: GetSignaturesOpts = { limit, commitment: this.commitment }
    if (until) opts.until = until
    const result = await this.rpc<SignatureInfo[]>("getSignaturesForAddress", [address, opts])
    return Array.isArray(result) ? result : []
  }

  /**
   * Load a transaction by signature with parsed token balances
   */
  private async fetchTransaction(signature: string): Promise<ParsedTransaction | null> {
    const cfg: GetTransactionConfig = {
      maxSupportedTransactionVersion: 0,
      commitment: this.commitment,
    }
    const result = await this.rpc<ParsedTransaction | null>("getTransaction", [signature, cfg])
    return result
  }

  /**
   * Analyze token activity touching the provided address and filter to the same mint
   * This mirrors your original call signature for compatibility:
   *   analyzeActivity("MintPubkeyHere", 50)
   * It will:
   * 1) get signatures for that address
   * 2) scan each tx’s token balances
   * 3) include deltas where the post.mint matches the provided string
   */
  async analyzeActivity(addressOrMint: string, limit = 50): Promise<ActivityRecord[]> {
    const sigs = await this.fetchRecentSignatures(addressOrMint, limit)
    const out: ActivityRecord[] = []

    for (const s of sigs) {
      const tx = await this.fetchTransaction(s.signature)
      if (!tx || !tx.meta) continue

      const pre = tx.meta.preTokenBalances ?? []
      const post = tx.meta.postTokenBalances ?? []

      // Index pre balances by accountIndex for fast lookup
      const preByIndex = new Map<number, TokenBalanceEntry>()
      for (const pb of pre) preByIndex.set(pb.accountIndex, pb)

      // Walk post balances and compute deltas, filtered to the target mint
      for (const p of post) {
        if (!p.mint) continue
        if (p.mint !== addressOrMint) continue

        const q = preByIndex.get(p.accountIndex)
        const preUi = q?.uiTokenAmount?.uiAmount ?? 0
        const postUi = p.uiTokenAmount?.uiAmount ?? 0
        const delta = (postUi || 0) - (preUi || 0)

        if (delta === 0) continue

        const isReceive = delta > 0
        out.push({
          timestamp: (tx.blockTime ?? 0) * 1000,
          signature: s.signature,
          source: isReceive ? (q?.owner ?? null) : (p.owner ?? null),
          destination: isReceive ? (p.owner ?? null) : (q?.owner ?? null),
          amount: Math.abs(delta),
          mint: p.mint,
          slot: tx.slot ?? s.slot,
          err: tx.meta.err ? String(tx.meta.err) : null,
          confirmationStatus: s.confirmationStatus,
        })
      }
    }

    // Deduplicate by signature+amount+dest, then sort newest first
    const dedupKey = (r: ActivityRecord) => `${r.signature}:${r.destination}:${r.amount}`
    const seen = new Set<string>()
    const deduped: ActivityRecord[] = []
    for (const r of out) {
      const k = dedupKey(r)
      if (!seen.has(k)) {
        seen.add(k)
        deduped.push(r)
      }
    }
    deduped.sort((a, b) => b.timestamp - a.timestamp)
    return deduped
  }

  /**
   * Alternative: analyze activity for a specific address but force a mint filter explicitly
   * Useful when the address is not equal to the mint string you want to track
   */
  async analyzeActivityForAddress(address: string, mint: string, limit = 50): Promise<ActivityRecord[]> {
    const sigs = await this.fetchRecentSignatures(address, limit)
    const out: ActivityRecord[] = []

    for (const s of sigs) {
      const tx = await this.fetchTransaction(s.signature)
      if (!tx || !tx.meta) continue

      const pre = tx.meta.preTokenBalances ?? []
      const post = tx.meta.postTokenBalances ?? []
      const preByIndex = new Map<number, TokenBalanceEntry>()
      for (const pb of pre) preByIndex.set(pb.accountIndex, pb)

      for (const p of post) {
        if (p.mint !== mint) continue
        const q = preByIndex.get(p.accountIndex)
        const preUi = q?.uiTokenAmount?.uiAmount ?? 0
        const postUi = p.uiTokenAmount?.uiAmount ?? 0
        const delta = (postUi || 0) - (preUi || 0)
        if (delta === 0) continue

        const isReceive = delta > 0
        out.push({
          timestamp: (tx.blockTime ?? 0) * 1000,
          signature: s.signature,
          source: isReceive ? (q?.owner ?? null) : (p.owner ?? null),
          destination: isReceive ? (p.owner ?? null) : (q?.owner ?? null),
          amount: Math.abs(delta),
          mint: p.mint,
          slot: tx.slot ?? s.slot,
          err: tx.meta.err ? String(tx.meta.err) : null,
          confirmationStatus: s.confirmationStatus,
        })
      }
    }

    out.sort((a, b) => b.timestamp - a.timestamp)
    return out
  }
}
