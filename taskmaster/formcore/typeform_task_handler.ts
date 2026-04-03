import type { TaskFormInput } from "./taskFormSchemas"
import { TaskFormSchema } from "./taskFormSchemas"

/** Result shape for Typeform submission handling. */
export interface SubmissionResult {
  success: boolean
  message: string
  taskId?: string
  nextRunPreview?: string
}

/** Generate a short, URL‐safe id. */
const genId = (): string =>
  Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36)

/** Very small helper to trim string fields in the payload. */
function normalizePayload(raw: unknown): unknown {
  if (raw && typeof raw === "object") {
    const obj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      obj[k] =
        typeof v === "string"
          ? v.trim()
          : typeof v === "object" && v !== null
          ? normalizePayload(v)
          : v
    }
    return obj
  }
  return raw
}

/**
 * Processes a Typeform webhook payload to schedule a new task.
 * - Validates with Zod schema
 * - Generates a task id
 * - Returns a friendly message and a simple next-run preview
 */
export async function handleTypeformSubmission(raw: unknown): Promise<SubmissionResult> {
  const normalized = normalizePayload(raw)
  const parsed = TaskFormSchema.safeParse(normalized)

  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => i.message).join("; ")
    return { success: false, message: `Validation error: ${issues}` }
  }

  const { taskName, taskType, parameters, scheduleCron } = parsed.data as TaskFormInput

  // stub: here you would persist the task and schedule it with your job runner
  const taskId = genId()

  // naive "next run" preview: just echoes the cron string; real code would compute next date
  const nextRunPreview = `cron(${scheduleCron})`

  return {
    success: true,
    message: `Task "${taskName}" (${taskType}) accepted and scheduled.`,
    taskId,
    nextRunPreview,
  }
}
