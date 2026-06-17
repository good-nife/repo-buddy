import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages"

export type { BetaMessageParam }

export type SSEEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use_start"; id: string; name: string }
  | { type: "tool_detail"; toolUseId: string; label: string }
  | { type: "tool_command_start"; toolUseId: string; command: string; args: string[] }
  | { type: "tool_command_end"; toolUseId: string; stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }
  | { type: "done"; messages: BetaMessageParam[]; stopReason: string | null }
  | { type: "error"; message: string }
