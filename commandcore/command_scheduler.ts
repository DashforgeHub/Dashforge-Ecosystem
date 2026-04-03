import { execCommand, ExecResult } from "./execCommand"

export interface ShellTask {
  id: string
  command: string
  description?: string
}

export interface ShellResult {
  taskId: string
  executedAt: number
  output?: string
  stderr?: string
  error?: string
  exitCode?: number
}

export class ShellTaskRunner {
  private tasks: ShellTask[] = []

  /**
   * Schedule a shell task for execution.
   */
  scheduleTask(task: ShellTask): void {
    this.tasks.push(task)
  }

  /**
   * List currently queued tasks.
   */
  listTasks(): ShellTask[] {
    return [...this.tasks]
  }

  /**
   * Execute all scheduled tasks in sequence.
   */
  async runAll(): Promise<ShellResult[]> {
    const results: ShellResult[] = []

    for (const task of this.tasks) {
      const start = Date.now()
      try {
        const res: ExecResult = await execCommand(task.command)
        results.push({
          taskId: task.id,
          executedAt: start,
          output: res.stdout,
          stderr: res.stderr,
          exitCode: res.exitCode,
        })
      } catch (err: any) {
        results.push({
          taskId: task.id,
          executedAt: start,
          error: err.message,
        })
      }
    }

    this.clear()
    return results
  }

  /**
   * Clear all queued tasks without executing.
   */
  clear(): void {
    this.tasks = []
  }
}
