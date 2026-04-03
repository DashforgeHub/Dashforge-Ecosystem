import type { z } from "zod"
import type { BaseAction, ActionResponse } from "./base_action"

interface AgentContext {
  apiEndpoint: string
  apiKey: string
}

/**
 * Central Agent: routes calls to registered actions.
 * - Validates payloads with each action's Zod schema
 * - Optional authorize(context) hook
 * - Small registry utilities
 */
export class Agent {
  private actions = new Map<string, BaseAction<any, any, AgentContext>>()

  register<S extends z.ZodObject<z.ZodRawShape>, R>(action: BaseAction<S, R, AgentContext>): void {
    if (this.actions.has(action.id)) {
      throw new Error(`Action already registered: "${action.id}"`)
    }
    this.actions.set(action.id, action)
  }

  unregister(actionId: string): boolean {
    return this.actions.delete(actionId)
  }

  has(actionId: string): boolean {
    return this.actions.has(actionId)
  }

  list(): string[] {
    return Array.from(this.actions.keys())
  }

  describe(actionId: string): { id: string; summary: string; version?: string } | null {
    const a = this.actions.get(actionId)
    return a ? { id: a.id, summary: a.summary, version: a.version } : null
  }

  /**
   * Invoke an action by id with a raw payload.
   * - Validates input with action.input.safeParse
   * - Applies optional authorize(context)
   * - Adds duration meta
   */
  async invoke<R>(actionId: string, payload: unknown, context: AgentContext): Promise<ActionResponse<R>> {
    const action = this.actions.get(actionId)
    if (!action) {
      return {
        status: "error",
        notice: "action not found",
        error: { code: "NOT_FOUND", message: `Unknown action "${actionId}"` },
      }
    }

    if (typeof action.authorize === "function") {
      const allowed = await action.authorize(context)
      if (!allowed) {
        return {
          status: "error",
          notice: "forbidden",
          error: { code: "UNAUTHORIZED", message: `Not allowed to invoke "${actionId}"` },
        }
      }
    }

    const parsed = action.input.safeParse(payload)
    if (!parsed.success) {
      return {
        status: "error",
        notice: "validation failed",
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map(i => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; "),
          details: { issues: parsed.error.issues },
        },
      }
    }

    const t0 = performance?.now?.() ?? Date.now()
    try {
      const res = await action.execute({ payload: parsed.data, context })
      const t1 = performance?.now?.() ?? Date.now()
      res.meta = { ...(res.meta ?? {}), actionId: action.id, version: action.version, durationMs: Math.round(t1 - t0) }
      return res as ActionResponse<R>
    } catch (err: any) {
      const t1 = performance?.now?.() ?? Date.now()
      return {
        status: "error",
        notice: "execution failed",
        error: { code: "ACTION_ERROR", message: err?.message ?? String(err), details: { stack: err?.stack } },
        meta: { actionId: action.id, version: action.version, durationMs: Math.round(t1 - t0) },
      }
    }
  }
}
