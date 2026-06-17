"use client"

import { useRef } from "react"

export interface PendingImage {
  dataUrl: string
  mediaType: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled: boolean
  pendingImage: PendingImage | null
  onImageChange: (image: PendingImage | null) => void
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
const MAX_BYTES = 4 * 1024 * 1024

export function ChatInput({ value, onChange, onSubmit, disabled, pendingImage, onImageChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && (value.trim() || pendingImage)) onSubmit()
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("Unsupported file type. Use JPEG, PNG, GIF, or WebP.")
      return
    }
    if (file.size > MAX_BYTES) {
      alert("Image must be under 4 MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      onImageChange({ dataUrl, mediaType: file.type })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      {pendingImage && (
        <div className="mb-2 max-w-3xl mx-auto flex items-start gap-2">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImage.dataUrl}
              alt="attachment"
              className="h-20 w-auto rounded-lg border border-slate-200 object-cover"
            />
            <button
              onClick={() => onImageChange(null)}
              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-white text-xs hover:bg-slate-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 items-end max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          title="Attach image"
          className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Claude to change something in the repo…"
          rows={2}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          onClick={onSubmit}
          disabled={disabled || (!value.trim() && !pendingImage)}
          className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </div>
      <p className="mt-1 text-center text-xs text-slate-400">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  )
}
