"use client"

import { useState, useCallback, useEffect } from "react"
import { ChatMessages } from "@/components/ChatMessages"
import { ChatInput, type PendingImage } from "@/components/ChatInput"
import type { ToolActivityEntry } from "@/components/ToolActivity"
import type { BetaMessageParam, SSEEvent } from "@/types/chat"

const STORAGE_KEY = "repo-buddy-messages"

function stripImageData(messages: BetaMessageParam[]): BetaMessageParam[] {
  return messages.map((msg) => {
    if (msg.role !== "user" || typeof msg.content === "string") return msg
    const stripped = (msg.content as unknown[]).map((block: any) =>
      block.type === "image" ? { type: "text", text: "[image]" } : block
    )
    return { ...msg, content: stripped }
  })
}

function loadMessages(): BetaMessageParam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveMessages(messages: BetaMessageParam[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripImageData(messages)))
  } catch {}
}

export default function ChatPage() {
  const [messages, setMessages] = useState<BetaMessageParam[]>([])
  const [input, setInput] = useState("")
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null)
  const [streamingText, setStreamingText] = useState("")
  const [toolActivities, setToolActivities] = useState<ToolActivityEntry[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMessages(loadMessages())
  }, [])

  const handleEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case "text_delta":
        setStreamingText((t) => t + event.text)
        break

      case "tool_use_start":
        setToolActivities((prev) => [
          ...prev.map((a) => ({ ...a, done: true })),
          { toolUseId: event.id, name: event.name, done: false },
        ])
        break

      case "tool_detail":
        setToolActivities((prev) =>
          prev.map((a) =>
            a.toolUseId === event.toolUseId ? { ...a, label: event.label } : a
          )
        )
        break

      case "tool_command_start":
        setToolActivities((prev) =>
          prev.map((a) =>
            a.toolUseId === event.toolUseId
              ? { ...a, command: event.command, args: event.args }
              : a
          )
        )
        break

      case "tool_command_end":
        setToolActivities((prev) =>
          prev.map((a) =>
            a.toolUseId === event.toolUseId
              ? { ...a, stdout: event.stdout, stderr: event.stderr, exitCode: event.exitCode, timedOut: event.timedOut, done: true }
              : a
          )
        )
        break

      case "done":
        setMessages(() => {
          saveMessages(event.messages)
          return event.messages
        })
        setStreamingText("")
        setToolActivities((prev) => prev.map((a) => ({ ...a, done: true })))
        setIsStreaming(false)
        break

      case "error":
        setError(event.message)
        setStreamingText("")
        setIsStreaming(false)
        break
    }
  }, [])

  function clearHistory() {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }

  async function handleSubmit() {
    const userText = input.trim()
    if ((!userText && !pendingImage) || isStreaming) return

    const contentBlocks: any[] = []
    if (pendingImage) {
      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: pendingImage.mediaType,
          data: pendingImage.dataUrl.split(",")[1],
        },
      })
    }
    if (userText) {
      contentBlocks.push({ type: "text", text: userText })
    }

    const newMessage: BetaMessageParam = {
      role: "user",
      content: contentBlocks.length === 1 && !pendingImage ? userText : contentBlocks,
    }
    const nextMessages = [...messages, newMessage]

    setMessages(nextMessages)
    setInput("")
    setPendingImage(null)
    setStreamingText("")
    setToolActivities([])
    setIsStreaming(true)
    setError(null)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`Request failed: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.slice(6)) as SSEEvent
            handleEvent(event)
          } catch {
            // malformed frame — skip
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong"
      setError(message)
      setIsStreaming(false)
      setStreamingText("")
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shrink-0">
        <h1 className="text-sm font-semibold text-slate-900">Repo Buddy</h1>
        <div className="flex items-center gap-4">
          {messages.length > 0 && !isStreaming && (
            <button
              onClick={clearHistory}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Clear history
            </button>
          )}
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
          <button className="ml-2 underline text-xs" onClick={() => setError(null)}>
            dismiss
          </button>
        </div>
      )}

      <ChatMessages
        messages={messages}
        streamingText={streamingText}
        toolActivities={toolActivities}
        isStreaming={isStreaming}
      />

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isStreaming}
        pendingImage={pendingImage}
        onImageChange={setPendingImage}
      />
    </div>
  )
}
