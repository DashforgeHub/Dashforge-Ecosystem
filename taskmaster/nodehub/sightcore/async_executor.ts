/**
 * Task execution engine: registers handlers and runs queued tasks.
 */
type Handler = (params: any) => Promise<any>

interface Task {
  id: string
  type: string
  params: any
}

interface ExecutionResult {
  id: string
  result?: any
  error?: string
  startedAt: number
  finishedAt: number
}

export class ExecutionEngine {
  private handlers: Record<string, Handler> = {}
  private queue: Task[] = []

  /**
   * Register a handler function for a given task type.
   */
  register(type: string, handler: Handler): void {
    this.handlers[type] = handler
  }

  /**
   * Add a task to the execution queue.
   */
  enqueue(id: string, type: string, params: any): void {
    if (!this.handlers[type]) {
      throw new Error(`No handler registered for type "${type}"`)
    }
    this.queue.push({ id, type, params })
  }

  /**
   * Run all tasks in the queue sequentially.
   */
  async runAll(): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = []
    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      const startedAt = Date.now()
      try {
        const result = await this.handlers[task.type](task.params)
        results.push({
          id: task.id,
          result,
          startedAt,
          finishedAt: Date.now(),
        })
      } catch (err: any) {
        results.push({
          id: task.id,
          error: err?.message || "Unknown error",
          startedAt,
          finishedAt: Date.now(),
        })
      }
    }
    return results
  }

  /**
   * Clear all queued tasks without running them.
   */
  clearQueue(): void {
    this.queue = []
  }

  /**
   * Inspect the current queue (without modifying it).
   */
  getQueueSnapshot(): Task[] {
    return [...this.queue]
  }
}
