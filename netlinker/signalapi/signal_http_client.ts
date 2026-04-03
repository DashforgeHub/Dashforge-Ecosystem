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
  fetchedAt?: number
}

/**
 * HTTP client for fetching and querying signals from ArchiNet.
 */
export class SignalApiClient {
  constructor(private baseUrl: string, private apiKey?: string) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  async fetchAllSignals(): Promise<ApiResponse<Signal[]>> {
    try {
      const res = await fetch(`${this.baseUrl}/signals`, {
        method: "GET",
        headers: this.getHeaders(),
      })
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
      const data = (await res.json()) as Signal[]
      return { success: true, data, fetchedAt: Date.now() }
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
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
      const data = (await res.json()) as Signal
      return { success: true, data, fetchedAt: Date.now() }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async fetchSignalsByType(type: string): Promise<ApiResponse<Signal[]>> {
    try {
      const res = await fetch(`${this.baseUrl}/signals?type=${encodeURIComponent(type)}`, {
        method: "GET",
        headers: this.getHeaders(),
      })
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
      const data = (await res.json()) as Signal[]
      return { success: true, data, fetchedAt: Date.now() }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async deleteSignal(id: string): Promise<ApiResponse<null>> {
    try {
      const res = await fetch(`${this.baseUrl}/signals/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      })
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
      return { success: true, data: null, fetchedAt: Date.now() }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}
