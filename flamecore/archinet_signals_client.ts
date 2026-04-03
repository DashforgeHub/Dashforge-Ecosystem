export interface Signal {
  id: string
  type: string
  timestamp: number
  payload: Record<string, any>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  status?: number
  durationMs?: number
}

export interface ClientOptions {
  apiKey?: string
  timeoutMs?: number
}

/**
 * Simple HTTP client for fetching signals from ArchiNet.
 */
export class SignalApiClient {
  constructor(private baseUrl: string, private opts: ClientOptions = {}) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.opts.apiKey) headers.Authorization = `Bearer ${this.opts.apiKey}`
    return headers
  }

  private async request<T>(path: string): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? 10_000)
    const started = Date.now()
    try {
      const res = await fetch(url, { method: "GET", headers: this.getHeaders(), signal: controller.signal })
      const durationMs = Date.now() - started
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        return { success: false, error: `HTTP ${res.status}: ${text}`.trim(), status: res.status, durationMs }
      }
      const json = (await res.json()) as T
      return { success: true, data: json, status: res.status, durationMs }
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) }
    } finally {
      clearTimeout(timer)
    }
  }

  async fetchAllSignals(): Promise<ApiResponse<Signal[]>> {
    return this.request<Signal[]>("/signals")
  }

  async fetchSignalById(id: string): Promise<ApiResponse<Signal>> {
    return this.request<Signal>(`/signals/${encodeURIComponent(id)}`)
  }

  async fetchByType(type: string): Promise<ApiResponse<Signal[]>> {
    return this.request<Signal[]>(`/signals?type=${encodeURIComponent(type)}`)
  }

  async fetchSince(timestamp: number): Promise<ApiResponse<Signal[]>> {
    return this.request<Signal[]>(`/signals?since=${encodeURIComponent(timestamp)}`)
  }
}
