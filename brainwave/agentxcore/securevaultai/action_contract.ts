import { z } from "zod"

/**
 * Base types for any action.
 */

export type ActionSchema = z.ZodObject<z.ZodRawShape>
export type InferActionInput<S extends ActionSchema> = z.infer<S>

export type ActionStatus = "ok" | "error"

export interface ActionError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ActionResponse<T> {
  status: ActionStatus
  notice: string
  data?: T
  error?: ActionError
  meta?: {
    actionId?: string
    version?: string
    durationMs?: number
  }
}

export interface BaseAction<S extends ActionSchema, R, Ctx = unknown> {
  /** unique identifier of the action */
  id: string
  /** short human-readable summary */
  summary: string
  /** semantic version, optional */
  version?: string
  /** zod schema describing the input payload */
  input: S
  /**
   * optional authorization hook — return true to allow execution
   */
  authorize?(context: Ctx): boolean | Promise<boolean>
  /**
   * execute the action and return a structured ActionResponse
   */
  execute(args: { payload: InferActionInput<S>; context: Ctx }): Promise<ActionResponse<R>>
}

/* ---------------- helpers ---------------- */

/** Validate raw payload against the action schema. */
export function validateActionInput<S extends ActionSchema>(
  schema: S,
  raw: unknown
): { ok: true; data: InferActionInput<S> } | { ok: false; error: ActionResponse<never> } {
  const parsed = schema.safeParse(raw)
  if (parsed.success) return { ok: true, data: parsed.data }
  const issues = parsed.error.issues.map(i => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ")
  return {
    ok: false,
    error: {
      status: "error",
      notice: "validation failed",
      error: { code: "VALIDATION_ERROR", message: issues, details: { issues: parsed.error.issues } },
    },
  }
}

/** Build a standardized success response. */
export function okResponse<T>(
  notice: string,
  data?: T,
  meta?: ActionResponse<T>["meta"]
): ActionResponse<T> {
  return { status: "ok", notice, data, meta }
}

/** Build a standardized error response. */
export function errorResponse(
  notice: string,
  code: string,
  message: string,
  details?: Record<string, unknown>,
  meta?: ActionResponse<never>["meta"]
): ActionResponse<never> {
  return { status: "error", notice, error: { code, message, details }, meta }
}
