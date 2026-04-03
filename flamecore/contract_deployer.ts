export interface LaunchConfig {
  contractName: string
  parameters: Record<string, unknown>
  deployEndpoint: string
  apiKey?: string
  timeoutMs?: number          // optional request timeout
  retries?: number            // retry attempts (default 1 = no retry)
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  error?: string
  attempt?: number
  elapsedMs?: number
  raw?: unknown
}

export class LaunchNode {
  constructor(private config: LaunchConfig) {}

  async deploy(): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters } = this.config
    if (!deployEndpoint || !contractName) {
      return { success: false, error: "Missing deployEndpoint or contractName" }
    }

    const retries = Math.max(1, this.config.retries ?? 1)
    const timeoutMs = Math.max(0, this.config.timeoutMs ?? 15_000)

    for (let attempt = 1; attempt <= retries; attempt++) {
      const started = Date.now()
      const controller = new AbortController()
      const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined

      try {
        const res = await fetch(deployEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ contractName, parameters }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const text = await safeReadText(res)
          // for 5xx or network-ish issues, retry if attempts remain
          if (attempt < retries && res.status >= 500) {
            await backoff(attempt)
            continue
          }
          return {
            success: false,
            error: `HTTP ${res.status}: ${text}`.trim(),
            attempt,
            elapsedMs: Date.now() - started,
          }
        }

        const json = await safeReadJson(res)
        return {
          success: true,
          address: json.contractAddress ?? json.address ?? undefined,
          transactionHash: json.txHash ?? json.transactionHash ?? undefined,
          raw: json,
          attempt,
          elapsedMs: Date.now() - started,
        }
      } catch (err: any) {
        // AbortError or network error
        if (attempt < retries) {
          await backoff(attempt)
          continue
        }
        return {
          success: false,
          error: err?.message ?? String(err),
          attempt,
          elapsedMs: Date.now() - started,
        }
      } finally {
        if (timer) clearTimeout(timer)
      }
    }

    return { success: false, error: "Unknown deployment failure" }
  }
}

/* -------------------- helpers -------------------- */

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ""
  }
}

async function safeReadJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    // fallback to text if JSON parsing fails
    const text = await safeReadText(res)
    return { rawText: text }
  }
}

function backoff(attempt: number): Promise<void> {
  // simple linear backoff; could be exponential if desired
  const ms = 400 * attempt
  return new Promise((r) => setTimeout(r, ms))
}
