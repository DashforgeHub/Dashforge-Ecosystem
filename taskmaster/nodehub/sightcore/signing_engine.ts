export class SigningEngine {
  private keyPairPromise: Promise<CryptoKeyPair>

  constructor() {
    this.keyPairPromise = crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    )
  }

  /** Export the public key in PEM format (optional helper) */
  async exportPublicKey(): Promise<string> {
    const keyPair = await this.keyPairPromise
    const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey)
    const base64 = Buffer.from(spki).toString("base64")
    const lines = base64.match(/.{1,64}/g) || []
    return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`
  }

  /** Sign arbitrary string data, return base64 signature */
  async sign(data: string): Promise<string> {
    const keyPair = await this.keyPairPromise
    const enc = new TextEncoder().encode(data)
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keyPair.privateKey, enc)
    return Buffer.from(sig).toString("base64")
  }

  /** Verify signature against data */
  async verify(data: string, signature: string): Promise<boolean> {
    const keyPair = await this.keyPairPromise
    const enc = new TextEncoder().encode(data)
    const sig = Buffer.from(signature, "base64")
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", keyPair.publicKey, sig, enc)
  }
}
