import nodemailer from "nodemailer"

export interface AlertConfig {
  email?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    to: string[]
    secure?: boolean
  }
  console?: boolean
}

export interface AlertSignal {
  title: string
  message: string
  level: "info" | "warning" | "critical"
}

export class AlertService {
  constructor(private readonly cfg: AlertConfig) {}

  private async sendEmail(signal: AlertSignal): Promise<void> {
    if (!this.cfg.email) return
    const { host, port, user, pass, from, to, secure } = this.cfg.email
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: secure ?? port === 465,
        auth: { user, pass },
      })

      await transporter.sendMail({
        from,
        to,
        subject: `[${signal.level.toUpperCase()}] ${signal.title}`,
        text: signal.message,
      })
    } catch (err: any) {
      console.error(`Failed to send email alert: ${err.message}`)
    }
  }

  private logConsole(signal: AlertSignal): void {
    if (!this.cfg.console) return
    const timestamp = new Date().toISOString()
    console.log(
      `[ALERT][${signal.level.toUpperCase()}][${timestamp}] ${signal.title}\n${signal.message}`
    )
  }

  async dispatch(signals: AlertSignal[]): Promise<void> {
    for (const sig of signals) {
      await this.sendEmail(sig)
      this.logConsole(sig)
    }
  }
}
