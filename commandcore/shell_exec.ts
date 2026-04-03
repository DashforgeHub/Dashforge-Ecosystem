import { exec } from "child_process"

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * Execute a shell command and return structured output.
 * @param command Shell command to run (e.g., "ls -la")
 * @param timeoutMs Optional timeout in milliseconds (default: 30s)
 */
export function execCommand(
  command: string,
  timeoutMs: number = 30_000
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        return reject(
          new Error(
            `Command "${command}" failed with code ${error.code ?? "unknown"}: ${stderr || error.message}`
          )
        )
      }
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      })
    })

    child.on("exit", code => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Command "${command}" exited with code ${code}`))
      }
    })
  })
}
