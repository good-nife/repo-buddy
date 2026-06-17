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

type ContentBlock = Extract<BetaMessageParam["content"], unknown[]>[number]

function renderContent(content: BetaMessageParam["content"]) {
  if (typeof content === "string") {
    return <span className="whitespace-pre-wrap">{content}</span>
  }

  return (
    <>
      {(content as ContentBlock[]).map((block, i) => {
        if (block.type === "text") {
          return <span key={i} className="whitespace-pre-wrap">{block.text}</span>
        }
        if (block.type === "image") {
          const src =
            block.source.type === "base64"
              ? `data:${block.source.media_type};base64,${block.source.data}`
              : block.source.type === "url"
              ? block.source.url
              : null
          if (!src) return null
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={i} src={src} alt="attached image" className="mt-1 max-h-48 rounded-lg object-contain" />
        }
        return null
      })}
    </>
  )
}

function isToolResultOnly(msg: BetaMessageParam): boolean {
  if (msg.role !== "user" || typeof msg.content === "string") return false
  return (msg.content as ContentBlock[]).every((b) => b.type === "tool_result")
}

export function ChatMessages({ messages, streamingText, toolActivities, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText, toolActivities])

  const visibleMessages = messages.filter((m) => !isToolResultOnly(m))

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
          const hasText =
            typeof msg.content === "string"
              ? !!msg.content
              : (msg.content as ContentBlock[]).some((b) => b.type === "text" || b.type === "image")

          if (!hasText) return null

          return (
            <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
                }`}
              >
                {renderContent(msg.content)}
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

              {!streamingText && toolActivities.every((a) => a.done) && (
                <div className="flex items-center gap-1.5 px-4 py-3 text-xs text-slate-400">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                  <span className="ml-1">thinking…</span>
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
