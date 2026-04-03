(async () => {
  // Small helper to time async steps
  const measure = async <T>(label: string, fn: () => Promise<T>) => {
    const t0 = performance?.now?.() ?? Date.now()
    const result = await fn()
    const t1 = performance?.now?.() ?? Date.now()
    console.log(`${label} completed in ${Math.round(t1 - t0)} ms`)
    return result
  }

  // 1) Analyze activity
  const activityAnalyzer = new TokenActivityAnalyzer("https://solana.rpc")
  const records = await measure("Activity analysis", () =>
    activityAnalyzer.analyzeActivity("MintPubkeyHere", 20)
  )

  // 2) Analyze depth
  const depthAnalyzer = new TokenDepthAnalyzer("https://dex.api", "MarketPubkeyHere")
  const depthMetrics = await measure("Orderbook depth analysis", () =>
    depthAnalyzer.analyze(30)
  )

  // 3) Detect patterns (guard for empty inputs)
  const volumes = Array.isArray(records) ? records.map(r => r.amount || 0) : []
  const patterns =
    volumes.length > 0 ? detectVolumePatterns(volumes, 5, 100) : []

  // 4) Execute a custom task
  const engine = new ExecutionEngine()
  engine.register("report", async (params) => ({
    records: Array.isArray(params.records) ? params.records.length : 0,
    hasPatterns: patterns.length > 0,
    spread: depthMetrics?.spread ?? 0,
  }))
  engine.enqueue("task1", "report", { records })
  const taskResults = await measure("Task execution", () => engine.runAll())

  // 5) Sign the results (with basic sanity check)
  const signer = new SigningEngine()
  const payload = JSON.stringify({ depthMetrics, patterns, taskResults })
  const signature = await signer.sign(payload)
  const signatureValid = await signer.verify(payload, signature)

  // 6) Final report
  console.groupCollapsed("Analysis Summary")
  console.log("records:", records.length)
  console.log("depthMetrics:", depthMetrics)
  console.log("patterns:", patterns.length)
  console.log("taskResults:", taskResults)
  console.log("signatureValid:", signatureValid)
  console.groupEnd()

  // Optional: return object if running in an environment that reads top-level result
  return { records, depthMetrics, patterns, taskResults, signatureValid }
})().catch(err => {
  console.error("Pipeline failed:", err?.message || err)
})
