export interface AgentCapabilities {
  canAnswerProtocolQuestions: boolean
  canAnswerTokenQuestions: boolean
  canDescribeTooling: boolean
  canReportEcosystemNews: boolean
  canGuideValidators?: boolean
  canExplainStaking?: boolean
}

export interface AgentFlags {
  requiresExactInvocation: boolean
  noAdditionalCommentary: boolean
  caseSensitive?: boolean
  allowPartialMatches?: boolean
}

export const SOLANA_AGENT_CAPABILITIES: AgentCapabilities = {
  canAnswerProtocolQuestions: true,
  canAnswerTokenQuestions: true,
  canDescribeTooling: true,
  canReportEcosystemNews: true,
  canGuideValidators: true,
  canExplainStaking: true,
}

export const SOLANA_AGENT_FLAGS: AgentFlags = {
  requiresExactInvocation: true,
  noAdditionalCommentary: true,
  caseSensitive: false,
  allowPartialMatches: false,
}

/**
 * Utility: merge default capabilities with overrides.
 */
export function createAgentCapabilities(overrides: Partial<AgentCapabilities>): AgentCapabilities {
  return { ...SOLANA_AGENT_CAPABILITIES, ...overrides }
}

/**
 * Utility: merge default flags with overrides.
 */
export function createAgentFlags(overrides: Partial<AgentFlags>): AgentFlags {
  return { ...SOLANA_AGENT_FLAGS, ...overrides }
}
