import Anthropic from "@anthropic-ai/sdk"
import { withWorkspace } from "@/lib/workspace"
import { buildTools, SYSTEM_PROMPT } from "@/lib/agent"
import type { BetaMessageParam } from "@/types/chat"
import type { SSEEvent } from "@/types/chat"

export const maxDuration = 300

const client = new Anthropic()

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: BetaMessageParam[] }

  const encoder = new TextEncoder()

  const body = new ReadableStream({
    async start(controller) {
      function emit(event: SSEEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        await withWorkspace(async (repoDir) => {
          const tools = buildTools(repoDir, emit)

          const runner = client.beta.messages.toolRunner({
            model: "claude-sonnet-4-6",
            max_tokens: 8096,
            system: SYSTEM_PROMPT,
            messages,
            tools,
            stream: true,
          })

          for await (const msgStream of runner) {
            for await (const event of msgStream) {
              if (
                event.type === "content_block_start" &&
                event.content_block.type === "tool_use"
              ) {
                emit({ type: "tool_use_start", id: event.content_block.id, name: event.content_block.name })
              } else if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                emit({ type: "text_delta", text: event.delta.text })
              }
            }
          }

          emit({
            type: "done",
            messages: runner.params.messages as BetaMessageParam[],
            stopReason: null,
          })
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong"
        emit({ type: "error", message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
