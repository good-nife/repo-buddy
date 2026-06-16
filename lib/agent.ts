import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema"
import { promises as fs } from "node:fs"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { runCommand, CommandRejected } from "@/lib/commands"
import type { SSEEvent } from "@/types/chat"

const execFileAsync = promisify(execFile)

export const SYSTEM_PROMPT = `\
You are an AI coding assistant helping edit the repository good-nife/email — a Next.js 16 + TypeScript + Tailwind v4 email app called Clario.

Before making any edits, read AGENTS.md and CLAUDE.md at the repo root — they contain important breaking-change notes for this version of Next.js that differ from your training data.

## Rules
- Always read a file before editing it.
- Run \`npx tsc --noEmit\` to verify type-correctness before calling commit_and_push.
- Keep changes minimal — match existing style and conventions.
- Ask for clarification before making risky or ambiguous changes.
- Do not call git push, git fetch, git remote, or git config directly — use the commit_and_push tool.

## Tools available
- read_file: Read a file's contents
- write_file: Write or overwrite a file
- list_dir: List files in a directory
- run_command: Run git/npm/npx/node/tsc inside the repo (git push/fetch/remote/clone/config are blocked)
- commit_and_push: Stage all changes, commit, and push to master`

function resolveSafe(repoDir: string, filePath: string): string {
  const repoResolved = path.resolve(repoDir)
  const fileResolved = path.resolve(repoDir, filePath)
  if (fileResolved !== repoResolved && !fileResolved.startsWith(repoResolved + path.sep)) {
    throw new Error(`Path "${filePath}" is outside the repository.`)
  }
  return fileResolved
}

export function buildTools(repoDir: string, emit: (event: SSEEvent) => void) {
  return [
    betaTool({
      name: "read_file",
      description: "Read the contents of a file in the repository.",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: { type: "string" as const, description: "Path relative to the repository root" },
        },
        required: ["path"],
      },
      async run({ path: filePath }) {
        const resolved = resolveSafe(repoDir, filePath)
        return await fs.readFile(resolved, "utf-8")
      },
    }),

    betaTool({
      name: "write_file",
      description: "Write or overwrite a file in the repository.",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: { type: "string" as const, description: "Path relative to the repository root" },
          content: { type: "string" as const, description: "Full file content to write" },
        },
        required: ["path", "content"],
      },
      async run({ path: filePath, content }) {
        const resolved = resolveSafe(repoDir, filePath)
        await fs.mkdir(path.dirname(resolved), { recursive: true })
        await fs.writeFile(resolved, content, "utf-8")
        return `Wrote ${filePath}`
      },
    }),

    betaTool({
      name: "list_dir",
      description: "List files and directories at a path in the repository.",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: { type: "string" as const, description: "Path relative to the repository root (use '.' for root)" },
        },
        required: ["path"],
      },
      async run({ path: dirPath }) {
        const resolved = resolveSafe(repoDir, dirPath)
        const entries = await fs.readdir(resolved, { withFileTypes: true })
        return entries.map((e) => `${e.isDirectory() ? "d" : "f"} ${e.name}`).join("\n")
      },
    }),

    betaTool({
      name: "run_command",
      description:
        "Run an allowed command (git, npm, npx, node, tsc) inside the repository. " +
        "git push/fetch/remote/clone/submodule/config are blocked — use commit_and_push instead.",
      inputSchema: {
        type: "object" as const,
        properties: {
          command: { type: "string" as const, description: "Command to run: git, npm, npx, node, or tsc" },
          args: {
            type: "array" as const,
            items: { type: "string" as const },
            description: "Arguments to pass to the command",
          },
        },
        required: ["command", "args"],
      },
      async run({ command, args }, context) {
        const toolUseId = context?.toolUse.id ?? ""
        emit({ type: "tool_command_start", toolUseId, command, args })

        try {
          const result = await runCommand(repoDir, command, args)
          emit({ type: "tool_command_end", toolUseId, ...result })

          const parts: string[] = []
          if (result.timedOut) parts.push("(timed out after 120s)")
          if (result.stdout) parts.push(`stdout:\n${result.stdout}`)
          if (result.stderr) parts.push(`stderr:\n${result.stderr}`)
          parts.push(`exit code: ${result.exitCode ?? "unknown"}`)
          return parts.join("\n\n")
        } catch (err) {
          if (err instanceof CommandRejected) {
            emit({ type: "tool_command_end", toolUseId, stdout: "", stderr: err.message, exitCode: 1, timedOut: false })
            return `Rejected: ${err.message}`
          }
          throw err
        }
      },
    }),

    betaTool({
      name: "commit_and_push",
      description:
        "Stage all changes, create a commit, and push to master. " +
        "Only call this after running npx tsc --noEmit to confirm the code compiles.",
      inputSchema: {
        type: "object" as const,
        properties: {
          message: { type: "string" as const, description: "Commit message" },
        },
        required: ["message"],
      },
      async run({ message }) {
        const { stdout: status } = await execFileAsync("git", ["status", "--porcelain"], { cwd: repoDir })
        if (!status.trim()) return "Nothing to commit — working tree is clean."

        await execFileAsync("git", ["add", "-A"], { cwd: repoDir })
        await execFileAsync("git", ["commit", "-m", message], { cwd: repoDir })
        const { stdout: log } = await execFileAsync("git", ["log", "-1", "--format=%H %s"], { cwd: repoDir })
        await execFileAsync("git", ["push", "origin", "master"], { cwd: repoDir })

        return `Pushed: ${log.trim()}`
      },
    }),
  ]
}
