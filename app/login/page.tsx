"use client"

import { useState } from "react"

export default function LoginPage() {
  const [code, setCode] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showKeyHelp, setShowKeyHelp] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, apiKey: apiKey.trim() || undefined }),
    })

    if (res.ok) {
      window.location.href = "/"
      return
    }

    const data = await res.json().catch(() => ({}))
    setError(data.error ?? "Something went wrong")
    setSubmitting(false)
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">Repo Buddy</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the access code to continue.</p>

        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Access code"
          autoFocus
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-500">
              Anthropic API key <span className="font-normal text-slate-400">(optional — use your own credits)</span>
            </label>
            <button
              type="button"
              onClick={() => setShowKeyHelp((v) => !v)}
              className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors shrink-0 ml-2"
            >
              {showKeyHelp ? "Hide" : "How to get one"}
            </button>
          </div>

          {showKeyHelp && (
            <div className="mb-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-600 space-y-1.5">
              <p className="font-medium text-slate-700">Getting an Anthropic API key</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-500">
                <li>Go to <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">console.anthropic.com</a> and create an account.</li>
                <li>Add billing credits under <span className="font-medium text-slate-600">Settings → Billing</span>. $5–10 is plenty to start.</li>
                <li>Go to <span className="font-medium text-slate-600">API Keys</span> in the sidebar, click <span className="font-medium text-slate-600">Create Key</span>, and copy it.</li>
                <li>Paste the key below (starts with <span className="font-mono">sk-ant-</span>).</li>
              </ol>
              <p className="text-slate-400">Your key is encrypted and only used for your sessions. Monitor usage at console.anthropic.com.</p>
            </div>
          )}

          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !code}
          className="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? "Checking..." : "Continue"}
        </button>
      </form>
    </div>
  )
}
