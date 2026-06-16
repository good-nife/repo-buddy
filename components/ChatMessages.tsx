"use client"

import { useEffect, useRef } from "react"
import { ToolActivity, type ToolActivityEntry } from "./ToolActivity"
import type { BetaMessageParam } from "@/types/chat"

interface Props {
  messages: BetaMessageParam[]
  streamingText: string
  toolActivities: ToolActivityEntry[]
  isStreaming: boolean
}

function getTextContent(content: BetaMessageParam["content"]): string {
  if (typeof content === "string") return content
  return content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
}

export function ChatMessages({ messages, streamingText, toolActivities, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText, toolActivities])

  const visibleMessages = messages.filter((m) => {
    if (m.role === "user") {
      const content = m.content
      if (Array.isArray(content) && content.every((b) => b.type === "tool_result")) return false
    }
    return true
  })

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {visibleMessages.length === 0 && !isStreaming && (
          <p className="text-center text-sm text-slate-400 mt-16">
            Say something to get started. Claude can read files, write code, and push to the repo.
          </p>
        )}

        {visibleMessages.map((msg, i) => {
          const isUser = msg.role === "user"
          const text = getTextContent(msg.content)

          if (!text) return null

          return (
            <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
                }`}
              >
                {text}
              </div>
            </div>
          )
        })}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[80%] w-full">
              {streamingText && (
                <div className="rounded-2xl rounded-bl-sm bg-white border border-slate-200 px-4 py-2.5 text-sm leading-relaxed text-slate-800 shadow-sm whitespace-pre-wrap mb-2">
                  {streamingText}
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-slate-400 animate-pulse align-text-bottom" />
                </div>
              )}

              {toolActivities.map((a) => (
                <ToolActivity key={a.toolUseId} {...a} />
              ))}

              {!streamingText && toolActivities.length === 0 && (
                <div className="flex gap-1 px-4 py-3">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
