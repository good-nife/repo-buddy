# Repo Buddy

A chat interface where a trusted user can ask Claude to edit and push code to `good-nife/email`.

## How it works

- Access is gated by a shared access code (no accounts).
- Each chat turn clones/syncs the repo, runs Claude with file/shell tools, then optionally commits and pushes to master.
- Hosted on Railway with a persistent volume for the workspace clone.

## Setup

### 1. Create a GitHub fine-grained PAT

Go to GitHub → Settings → Developer settings → Fine-grained personal access tokens → Generate new token.

- **Repository access**: `good-nife/email` only
- **Permissions**: Contents → Read and write

Copy the token as `GITHUB_TOKEN`.

### 2. Get a Claude API key

From [console.anthropic.com](https://console.anthropic.com). Copy as `ANTHROPIC_API_KEY`.

### 3. Pick an access code

Choose any strong password. This is what the user enters at the login screen.

### 4. Generate a session secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 5. Deploy to Railway

1. Create a new Railway project from this repo.
2. Add a **Volume** mounted at `/data`.
3. Set these environment variables:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | from step 2 |
| `GITHUB_TOKEN` | from step 1 |
| `REPO_URL` | `https://github.com/good-nife/email` |
| `ACCESS_CODE` | from step 3 |
| `SESSION_SECRET` | from step 4 |
| `WORKSPACE_ROOT` | `/data/workspace` |

4. Deploy. Railway will build the Docker image and start the server.

### 6. Share the URL

Send the Railway URL and the `ACCESS_CODE` to whoever needs access.

## Local development

```bash
cp .env.local.example .env.local
# Fill in ANTHROPIC_API_KEY, GITHUB_TOKEN, ACCESS_CODE, SESSION_SECRET
# WORKSPACE_ROOT=./workspace is fine for local dev
npm install
npm run dev
```

The workspace directory is gitignored — the repo will be cloned there on first use.

## Security notes

- The `GITHUB_TOKEN` is embedded in the cloned repo's `.git/config` on the Railway volume in plaintext. Acceptable for a single-friend tool, but rotate the token if the volume is ever exposed.
- Pushes go directly to master with no PR step — intentional, but means a bad change lands immediately.
- The allow-list blocks `git push/fetch/remote/clone/config` and destructive flags (`--force`, `--hard`, etc.) from the agent's shell tool. Pushes only happen through the dedicated `commit_and_push` tool.
