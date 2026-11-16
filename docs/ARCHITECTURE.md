# Architecture — Soma

> Status: **final (Phase 0b)**. Replaces `ARCHITECTURE_PROPOSAL.md`, which remains as a record of the discarded alternatives.
> Stack: Next.js 16.4.3 (App Router, `cacheComponents: true`), React 19.3, TypeScript strict, Tailwind 4, pnpm, Zod 4. Tests with `node:test` (Node 24).

## Decision

**Feature modules ("screaming") with ports only at the edges.** Each feature lives in `src/features/<name>/`. Interfaces exist only where something will really be swapped: persistence and external clients. A single composition root (`src/server/services.ts`) picks the adapters. No DI container, no use-case classes.

## Structure

```
apps/web/
  data/
    seed/        starting JSON (versioned)
    runtime/     live "database" (ignored; created from seed)
    fixtures/    sample responses for mocks (versioned, synthetic)
  scripts/db-reset.ts
  src/
    app/         thin routes: they only compose features (+ error.tsx, not-found.tsx); table in docs/ROUTES.md
    features/
      crew/      reference vertical slice (see below)
      risk/      classifier.port.ts · classifier.mock.ts · risk.queries.ts · components/
      plan/      planner.port.ts · planner.mock.ts · ollama.client.ts · planner.chain.ts · planner.fixture.ts · components/
      space-weather/  space-weather.port.ts · radiation.port.ts · space-weather.fixture.ts
    server/
      config.ts      the only place that reads process.env (validated with Zod)
      services.ts    composition: picks the adapter based on config
      json-store.ts  atomic read/write + mutex
      fixtures.ts    reads and validates data/fixtures/*.json
    shared/      result.ts · source.ts · ui/ (OrganUI and shadcn components, installed as source code)
```

## Rules

1. **Domain = plain types + pure functions.** No classes; everything that crosses to the client is serializable.
2. **Interfaces only at the edges** (repositories and external clients).
3. **A single composition root.** Switching adapters is one line in `services.ts`.
4. **Thin routes.** `app/**/page.tsx` composes components; dynamic data goes inside `<Suspense>`. Each tab of `/report/[id]` shows one thing; the layout provides the header and tabs. Features do not know the routes: they receive the `href`s as props.
5. **Imports only go down:** `app → features → server/shared`. A feature does not import another's internals; it asks for what it needs through its `*.queries.ts`.
6. **Ports return `Result<T>`** (expected errors as a value). Bugs are thrown and caught by `error.tsx`.
7. **Every port response carries `source: { provider, mode, fetchedAt }`** and the UI displays it.
8. **Every clinical output shows uncertainty and requires human validation.** `CarePlanDraft.requiresHumanValidation` is the literal `true`; `RiskAssessment.calibrated` is `false` for LAYA and mocks.

## Technical conventions (verified)

- **JSON data outside `src/` and never with `import x from './x.json'`.** With `cacheComponents`, synchronous I/O and imports get frozen into the build HTML. Read with `fs/promises` on every request, inside `<Suspense>` (`node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`). **Verified** with `next start`: editing `data/runtime/crew.json` shows up on the next request, without a rebuild.
- **`'use cache'` only for read-only external data** (DONKI, SWPC), once their adapters exist.
- **`error.tsx` receives `retry`, not `reset`** in Next 16.4 (`.../03-file-conventions/error.md`).
- **`.ts` in relative imports** (`allowImportingTsExtensions`, `erasableSyntaxOnly`): tests run with `node --test` without a transpiler. Only syntax that Node erases (no `enum` or parameter properties).
- **Atomic writes** (`json-store.ts`): temp file + `rename`, with retries on `EPERM`/`EBUSY`/`EACCES`, and an in-process mutex per file. The lock map lives on `globalThis` to survive HMR. Scope: **a single local process**.
- **A provider without an adapter fails loudly** (`services.ts`), instead of serving mock data under the "live" label.

## Reference vertical slice: `crew`

| File | Role |
|---|---|
| `crew.schema.ts` | Zod schema; validates the JSON on every read |
| `crew.types.ts` | Types (inferred from the schema) and `CrewCardDTO` |
| `crew.logic.ts` | Pure functions: flags and attention level (illustrative thresholds, not clinical) |
| `crew.repository.ts` | Port |
| `crew.repository.json.ts` | Adapter over `json-store` |
| `crew.queries.ts` | `server-only` reads: `getCrewSummaries()` (the `/` list) and `getMissionMember(id)` (with per-request `cache()`); they return DTOs |
| `components/` | One piece per view: `CrewSummaryList`, `VitalsSummary`, `TrendsPanel`, `BodyPanel`, `AttentionBadge` |

To switch to SQLite or FastAPI: `crew.repository.sqlite.ts` or `crew.repository.http.ts` and one line in `services.ts`. Neither the logic nor the UI is touched.

## How to add a feature

1. **Folder:** `src/features/<name>/`.
2. **Types:** `<name>.types.ts` (and a DTO only if the UI needs a different shape). Zod schema if there is external data.
3. **Logic:** pure functions in `<name>.logic.ts`, with a `node:test` test next to it.
4. **Does it persist data?** `<name>.repository.ts` (port) and `<name>.repository.json.ts`, with a seed in `data/seed/<name>.json`.
5. **Does it call an external service?** Port, real adapter, mock and fixture in `data/fixtures/`. Register it in `server/services.ts`, its variables in `server/config.ts` and `.env.example`, and document it in `docs/SERVICES.md`.
6. **Read:** `<name>.queries.ts` with `import 'server-only'`, returning DTOs.
7. **Mutation:** `<name>.actions.ts` with `'use server'`; validate with Zod and return `Result`.
8. **UI:** `components/` inside the feature; `'use client'` only on interactive leaves.
9. **Route:** `app/<route>/page.tsx` composes the components; dynamic data and `params` go inside `<Suspense>`. Guide and route table in `docs/ROUTES.md`.
10. **Verify:** `pnpm test`, `pnpm lint` and `pnpm build` green, and the feature tried with `SOMA_OFFLINE=true`.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm test` | `node --test "src/**/*.test.ts"` |
| `pnpm lint` | ESLint |
| `pnpm db:reset` | Restores `data/runtime/` from `data/seed/` (useful before the demo) |

## If it is ever deployed (not today)

- JSON → SQLite/Postgres: the serverless file system is ephemeral and multi-instance.
- Secrets in a manager; Ollama on a host with a GPU; authentication.
- A distributed mutex or a transactional database.

## Not verified

- That `rename` on a locked file in Windows returns exactly `EPERM`, `EBUSY` or `EACCES` (Node does not document it). The retries are covered in the code, but no test forces the lock.
- That writing to `data/runtime/` never triggers a Turbopack reload in `next dev`. It does not happen with `next start`; it was not tested in dev.
