# ORCHESTRATOR — Soma

> Working guide for the orchestrator agent and for the subagents that implement a feature. Read it in full before touching code.

## Context in 5 lines

- Soma is a **local** space crew health monitoring prototype (no deployment, no auth).
- Stack: Next.js 16.4.3, React 19.3, TypeScript strict, Tailwind 4, Zod 4, **pnpm**. The app is in `apps/web`.
- Architecture: `docs/ARCHITECTURE.md` (feature modules, ports at the edges). External services: `docs/SERVICES.md`. Work list: `FEATURES.md`.
- Today there is **no Jev key and real MedGemma is not used**: the classifier and the planner are **simulations with random data** (`simulated-jev`, `simulated-medgemma`). The UI must always show that they are simulated.
- `AGENTS.md` in `apps/web` requires reading `node_modules/next/dist/docs/` before writing Next code: this Next is **not the one you know** (for example, `error.tsx` receives `retry`, not `reset`).

## Flow

| Phase | Who | What |
|---|---|---|
| Choose | User | Says "start N" (a feature from `FEATURES.md`). One feature at a time, unless they ask to parallelize |
| Prepare | Orchestrator | Checks for a clean tree (if not, warns and stops); creates branch and worktree `feat/NN-slug` |
| Implement | Subagent | Works only inside the worktree and writes `REPORT.md` |
| Review | User | Reviews the diff; asks for changes or says "approved" |
| Close | Orchestrator | On "approved": green build, selective `git add`, commit, asks about the merge |

If the user asks for changes, the orchestrator forwards them to the **same** subagent and review happens again.

## Rules for the orchestrator

1. **Never** commits, pushes, merges or deletes branches without the user's explicit approval.
2. Checks the working tree before creating the worktree. If there are uncommitted changes, warns and stops.
3. Creates the worktree **inside the user's home** (for example `<repo>-worktrees/feat-NN-slug`), never in `/tmp`.
4. Uses herdr for the panes following its official guide (https://raw.githubusercontent.com/ogulcancelik/herdr/master/SKILL.md). **Does not invent commands**: if the guide does not cover it, it says so.
5. Rejects, before showing it to the user, a feature that violates the approved architecture.
6. If something is ambiguous, asks **one** short question before delegating.
7. When the subagent finishes it delivers: a 5-line summary, `git status`, `git diff --stat` and how to test it in 3 steps. Then it waits.
8. On "approved": confirms `pnpm build`; `git add` **only** the feature's files (never a blind `-A`, excludes `REPORT.md`); commit with Conventional Commits `feat(<area>): <summary>` and a 2 to 4 line body; shows the hash; asks whether to merge into `main`; closes the pane; marks ✅ in `FEATURES.md`.
9. Every clinical output shows uncertainty and requires human validation. Always distinguishes what is **verified** (with a source) from what is **assumed**.

## Briefing for the subagent

Fill in the fields with the text from `FEATURES.md`:

```text
You are a Soma subagent. Implement ONLY feature N: <title>.
Goal: <goal>
Acceptance criteria: <list>
Out of scope: <list>
Context: read ORCHESTRATOR.md, docs/ARCHITECTURE.md and FEATURES.md.
Rules:
- Follow the approved architecture and its "how to add a feature" guide. If you think
  it is wrong or something is missing, say so instead of improvising another structure.
- Touch only the necessary files. No new dependencies without notice.
- External integrations always with a real version and a mock.
- Run `pnpm test`, `pnpm lint` and `pnpm build` and fix the errors before finishing.
- DO NOT commit, DO NOT push, DO NOT switch branches.
- When done, write REPORT.md (outside version control): what you did,
  modified files, how to test it in 3 steps, known limits, decisions made.
  Then stop and wait.
```

## Rules for the subagent

- **Test first** when there is pure logic: write the test, watch it fail, implement, watch it pass. Tests with `node:test` (`pnpm test`); `vitest` is not added.
- **Repo conventions:** relative imports with the `.ts` extension in the files that tests reach; only syntax that Node can erase (no `enum` or parameter properties); `import 'server-only'` in queries, `services.ts` and adapters.
- **JSON data:** read with `fs/promises` from `data/`, **never** with `import x from './x.json'`, and always inside `<Suspense>` (because of `cacheComponents`). Validated with Zod.
- **External inputs** (forms, environment variables, service responses) are validated on the server with Zod.
- **A provider without an adapter fails loudly** in `services.ts`; it never serves mock data under a "live" label.
- **Simulations:** simulated responses carry a visible `source.provider` and `source.mode`. Do not present them as real data or as clinical output.
- **Language:** everything is in English: interface text, code, comments, commits and names.
- **Comments:** almost never; well-written code reads on its own. Only short one-line labels (for example `// GET -> LIST USERS`) or the why of something non-obvious. No JSDoc blocks that repeat what the code does.
- **No surprises with git:** do not switch branches, do not stash, do not touch files outside the feature.
- **If you get blocked**, stop and leave the concrete question in `REPORT.md`; do not improvise.

## What goes in `REPORT.md`

1. What you did (3 to 5 lines).
2. Modified and created files.
3. How to test it in 3 steps.
4. Acceptance criteria: which are met and with what evidence (command and observed result), which are not.
5. Known limits and what you could not verify.
6. Decisions you made and why.

## Useful commands (from `apps/web`)

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm test` | `node --test "src/**/*.test.ts"` |
| `pnpm lint` | ESLint |
| `pnpm db:reset` | Restores `data/runtime/` from `data/seed/` |

## Pending verification

- That the herdr guide covers creating panes, launching a subagent and reading its status (`done`/`blocked`). It is read before the first feature with `start N`.
