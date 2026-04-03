import type { TokenDataPoint } from "./tokenDataFetcher"

export interface DataIframeConfig {
  containerId: string
  iframeUrl: string
  apiBase: string
  token: string
  refreshMs?: number
}

export class TokenDataIframeEmbedder {
  private iframe?: HTMLIFrameElement
  private intervalId?: number

  constructor(private cfg: DataIframeConfig) {}

  async init() {
    const container = document.getElementById(this.cfg.containerId)
    if (!container) throw new Error(`Container not found: ${this.cfg.containerId}`)

    this.iframe = document.createElement("iframe")
    this.iframe.src = this.cfg.iframeUrl
    this.iframe.style.border = "none"
    this.iframe.width = "100%"
    this.iframe.height = "100%"
    this.iframe.onload = () => this.postTokenData()
    container.appendChild(this.iframe)

    if (this.cfg.refreshMs) {
      this.intervalId = window.setInterval(() => this.postTokenData(), this.cfg.refreshMs)
    }
  }

  private async postTokenData() {
    if (!this.iframe?.contentWindow) return

    const fetcherModule = await import("./tokenDataFetcher")
    const fetcher = new fetcherModule.TokenDataFetcher(this.cfg.apiBase)
    const data: TokenDataPoint[] = await fetcher.fetchHistory(this.cfg.token)

    this.iframe.contentWindow.postMessage(
      {
        type: "TOKEN_DATA",
        token: this.cfg.token,
        latest: data[data.length - 1] ?? null,
        data,
      },
      "*"
    )
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
  }
}
