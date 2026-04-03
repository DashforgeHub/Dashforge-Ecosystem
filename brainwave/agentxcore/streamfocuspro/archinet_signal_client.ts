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
}

/**
 * HTTP client for fetching signals from ArchiNet.
 */
export class SignalApiClient {
  constructor(private readonly baseUrl: string, private readonly apiKey?: string) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  private async handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
    const status = res.status
    try {
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        return { success: false, error: `HTTP ${status} ${text}`.trim(), status }
      }
      const data = (await res.json()) as T
      return { success: true, data, status }
    } catch (err: any) {
      return { success: false, error: err.message, status }
    }
  }

  async fetchAllSignals(): Promise<ApiResponse<Signal[]>> {
    try {
      const res = await fetch(`${this.baseUrl}/signals`, {
        method: "GET",
        headers: this.getHeaders(),
      })
      return this.handleResponse<Signal[]>(res)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async fetchSignalById(id: string): Promise<ApiResponse<Signal>> {
    try {
      const res = await fetch(`${this.baseUrl}/signals/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: this.getHeaders(),
      })
      return this.handleResponse<Signal>(res)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async searchSignalsByType(type: string): Promise<ApiResponse<Signal[]>> {
    try {
      const res = await fetch(`${this.baseUrl}/signals?type=${encodeURIComponent(type)}`, {
        method: "GET",
        headers: this.getHeaders(),
      })
      return this.handleResponse<Signal[]>(res)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}
