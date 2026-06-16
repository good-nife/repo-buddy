import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { promises as fs } from "node:fs"
import path from "node:path"

const execFileAsync = promisify(execFile)

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? path.join(process.cwd(), "workspace")
const REPO_URL = process.env.REPO_URL ?? "https://github.com/good-nife/email"
export const REPO_DIR = path.join(WORKSPACE_ROOT, "email")

function authenticatedRemote(): string {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN is not set")
  const url = new URL(REPO_URL)
  return `https://x-access-token:${token}@${url.host}${url.pathname}`
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function git(args: string[], cwd: string): Promise<void> {
  await execFileAsync("git", args, { cwd, windowsHide: true })
}

async function ensureCloned(): Promise<void> {
  await fs.mkdir(WORKSPACE_ROOT, { recursive: true })
  if (await pathExists(path.join(REPO_DIR, ".git"))) return

  await git(["clone", authenticatedRemote(), REPO_DIR], WORKSPACE_ROOT)
  await git(["config", "user.name", "Repo Buddy"], REPO_DIR)
  await git(["config", "user.email", "repo-buddy@users.noreply.github.com"], REPO_DIR)
}

async function syncToLatest(): Promise<void> {
  await git(["fetch", "origin", "master"], REPO_DIR)
  await git(["checkout", "master"], REPO_DIR)
  await git(["reset", "--hard", "origin/master"], REPO_DIR)
  await git(["clean", "-fd"], REPO_DIR)
}

// Serializes turns so concurrent requests can't interleave workspace mutations.
let queue: Promise<unknown> = Promise.resolve()

export function withWorkspace<T>(fn: (repoDir: string) => Promise<T>): Promise<T> {
  const task = queue.then(async () => {
    await ensureCloned()
    await syncToLatest()
    return fn(REPO_DIR)
  })

  queue = task.catch(() => {})
  return task
}
