import { execFile } from "node:child_process"

const ALLOWED_COMMANDS = new Set(["git", "npm", "npx", "node", "tsc"])

const BLOCKED_GIT_SUBCOMMANDS = new Set(["push", "fetch", "remote", "clone", "submodule", "config"])

const BLOCKED_ARGS = new Set([
  "--force",
  "-f",
  "--hard",
  "-D",
  "--delete",
  "rebase",
  "clean",
  "reflog",
  "filter-branch",
  "gc",
])

const TIMEOUT_MS = 120_000
const MAX_OUTPUT_CHARS = 20_000

export class CommandRejected extends Error {}

export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number | null
  timedOut: boolean
}

function truncate(output: string): string {
  if (output.length <= MAX_OUTPUT_CHARS) return output
  return `${output.slice(0, MAX_OUTPUT_CHARS)}\n...[truncated, ${output.length - MAX_OUTPUT_CHARS} more characters]`
}

export function assertCommandAllowed(command: string, args: string[]): void {
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new CommandRejected(
      `Command "${command}" is not allowed. Allowed commands: ${[...ALLOWED_COMMANDS].join(", ")}.`
    )
  }

  if (command === "git" && args.length > 0 && BLOCKED_GIT_SUBCOMMANDS.has(args[0])) {
    throw new CommandRejected(
      `"git ${args[0]}" is not allowed here. Use the commit_and_push tool to commit and push changes.`
    )
  }

  for (const arg of args) {
    if (BLOCKED_ARGS.has(arg)) {
      throw new CommandRejected(`Argument "${arg}" is not allowed.`)
    }
  }
}

export function runCommand(cwd: string, command: string, args: string[]): Promise<CommandResult> {
  assertCommandAllowed(command, args)

  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { cwd, timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        const timedOut = Boolean(error && (error as NodeJS.ErrnoException & { killed?: boolean }).killed)
        const exitCode = typeof (error as NodeJS.ErrnoException | null)?.code === "number"
          ? ((error as NodeJS.ErrnoException).code as unknown as number)
          : error
            ? 1
            : 0

        resolve({
          stdout: truncate(stdout.toString()),
          stderr: truncate(stderr.toString()),
          exitCode,
          timedOut,
        })
      }
    )
  })
}
