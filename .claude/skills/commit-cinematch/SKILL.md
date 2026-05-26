---
name: commit-cinematch
description: Use this skill when the user asks to commit, stage, or push changes in the CineMatch repository. Enforces project conventions — Conventional Commits in English, no trailing period, no emoji, scope from the touched app/package, refuses to commit if .env or secrets are staged. Triggers on phrases like "commit isso", "faz o commit", "stage and commit", "commitar", or any explicit commit request.
---

# Commit CineMatch

This skill standardizes commits across the CineMatch repo. Apply it any time the user asks you to commit changes.

## Pre-commit checklist (run in this order)

1. **Confirm intent.** Never commit without explicit user instruction. A user saying "salva isso" or "guarda o arquivo" is *not* a commit request — that means writing the file. "Commit", "commita", "faz o commit", "stage and commit" are commit requests.

2. **Inspect state before staging.**
   - Run `git status` to see what changed.
   - Run `git diff` (and `git diff --staged` if anything is already staged) to understand the actual change.
   - Run `git log --oneline -5` to match the style of recent commits.

3. **Block forbidden files.** If any of the following are about to be staged, stop and ask the user:
   - `.env`, `.env.local`, `.env.*.local`
   - `*.pem`, `*.key`, `*.p12`, `id_rsa*`
   - Any file containing `DATABASE_URL=`, `JWT_SECRET=`, `TMDB_API_KEY=`, `PINECONE_API_KEY=`, or similar real-value secrets (check with grep).
   - Anything inside `node_modules/`, `dist/`, `build/`, `.next/`, `__pycache__/`.

4. **Stage explicitly.** Prefer `git add <path>` over `git add .` or `git add -A`. List the files individually unless the user explicitly asked for a sweep.

## Writing the commit message

The format is **Conventional Commits in English**, no exceptions:

```
<type>(<scope>): <imperative subject>

[optional body — wrapped at 72 chars, explains *why*, not what]

[optional footer — e.g., BREAKING CHANGE: <description>]
```

### Type — pick one

| Type | When to use |
|---|---|
| `feat` | A new user-facing feature or capability |
| `fix` | A bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests only |
| `docs` | Changes to documentation only (anything under `docs/`, `README.md`, `CLAUDE.md`) |
| `style` | Formatting, whitespace, missing semicolons — no logic change |
| `chore` | Tooling, dependencies, build scripts — no app code change |
| `build` | Changes to build system, Docker, package manifests |
| `ci` | CI configuration |

### Scope — derive from the touched path

| Path touched | Scope |
|---|---|
| `apps/api/**` | `api` |
| `apps/worker/**` | `worker` |
| `apps/ml/**` | `ml` |
| `packages/database/**` | `database` |
| `docs/**`, `CLAUDE.md`, root `README.md` | `docs` |
| `.claude/skills/**` | `skills` |
| `docker-compose.yml`, `Dockerfile*`, `.dockerignore` | `infra` |
| Root config (`package.json`, `package-lock.json`, `.editorconfig`, `.gitignore`) | `repo` |
| Multiple unrelated areas | omit the scope |

### Subject rules

- Imperative mood: "add", "fix", "remove" — never "added", "adds", "adding".
- Lowercase first letter.
- No trailing period.
- 72 characters max.
- No emoji.
- No issue numbers in the subject (put them in the footer if needed: `Refs: #123`).

### Body rules

- Add a body only when the *why* is non-obvious or the change is non-trivial.
- Explain the motivation, the alternatives considered, or any side effects.
- Do not describe what the diff shows — the diff already does that.
- Wrap at 72 characters.

### Examples

Good:
```
feat(api): add match session lobby endpoint
```

```
fix(worker): handle empty Letterboxd diary RSS

Diary RSS returns 200 with an empty <channel> when the user has
no watched films. Previously the parser threw, killing the worker
and trapping the job in a retry loop.
```

```
refactor(database): split swipe relations into separate module

Swipe was importing User, Movie, and MatchSession directly, which
caused circular deps when the rooms module was added. Extracting
relations keeps Swipe a leaf.
```

Bad (do not produce):
- `Updated stuff` — not Conventional, vague
- `feat: Added new endpoint.` — past tense, trailing period
- `🎉 feat(api): novo endpoint` — emoji, mixed languages
- `feat(api): adds the match session lobby endpoint with rooms, presence tracking, and reconnect logic over websockets and also fixes the bug in jwt` — too long, multiple changes

## Committing

Always use a heredoc to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
feat(api): add match session lobby endpoint

Hosts now broadcast room state to guests on join. Lays the
groundwork for the swipe sync flow.
EOF
)"
```

Do **not** add `Co-Authored-By` lines unless the user has asked for attribution.

Do **not** use `--amend`, `--no-verify`, or `--force` without explicit permission.

## After committing

- Run `git status` to confirm the working tree state.
- Report the commit hash + subject back to the user in one line.
- Do not push unless explicitly asked.
