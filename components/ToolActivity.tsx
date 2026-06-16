"use client"

import { useState } from "react"

export interface ToolActivityEntry {
  toolUseId: string
  name: string
  command?: string
  args?: string[]
  stdout?: string
  stderr?: string
  exitCode?: number | null
  timedOut?: boolean
  done: boolean
}

export function ToolActivity({ name, command, args, stdout, stderr, exitCode, timedOut, done }: ToolActivityEntry) {
  const [open, setOpen] = useState(false)

  const label =
    name === "run_command" && command
      ? `$ ${command} ${args?.join(" ") ?? ""}`.trim()
      : name.replace(/_/g, " ")

  const hasOutput = Boolean(stdout || stderr)
  const failed = done && exitCode !== null && exitCode !== undefined && exitCode !== 0

  return (
    <div className="my-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono overflow-hidden">
      <button
        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors ${hasOutput ? "hover:bg-slate-100 cursor-pointer" : "cursor-default"}`}
        onClick={() => hasOutput && setOpen((o) => !o)}
        disabled={!hasOutput}
      >
        <span className={`shrink-0 ${!done ? "text-slate-400" : failed ? "text-red-500" : "text-green-600"}`}>
          {!done ? "⟳" : failed ? "✗" : "✓"}
        </span>
        <span className={`truncate ${failed ? "text-red-700" : "text-slate-700"}`}>{label}</span>
        {timedOut && <span className="ml-auto text-amber-600 shrink-0">timed out</span>}
        {hasOutput && <span className="ml-auto text-slate-400 shrink-0">{open ? "▲" : "▼"}</span>}
      </button>

      {open && hasOutput && (
        <div className="border-t border-slate-200 max-h-64 overflow-auto p-3 text-slate-700 whitespace-pre-wrap leading-relaxed">
          {stdout && <span>{stdout}</span>}
          {stderr && <span className="text-red-600">{stderr}</span>}
        </div>
      )}
    </div>
  )
}
