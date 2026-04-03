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
}

/**
 * HTTP client for fetching signals from ArchiNet.
 */
export class SignalApiClient {
  constructor(private baseUrl: string, private apiKey?: string) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  private async parseResponse<T>(res: Response): Promise<ApiResponse<T>> {
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { success: false, error: `HTTP ${res.status}: ${text}`.trim() }
    }
    const json = (await res.json()) as T
    return { success: true, data: json }
  }

  async fetchAllSignals(): Promise<ApiResponse<Signal[]>> {
    try {
      const res = await fetch(`${this.baseUrl}/signals`, {
        method: "GET",
        headers: this.getHeaders(),
      })
      return this.parseResponse<Signal[]>(res)
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
      return this.parseResponse<Signal>(res)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Utility: lists all available endpoints this client can call.
   */
  listEndpoints(): string[] {
    return [
      `${this.baseUrl}/signals`,
      `${this.baseUrl}/signals/{id}`,
    ]
  }
}
