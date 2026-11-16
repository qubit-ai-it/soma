# Architecture proposal — Soma prototype

> Status: **superseded**. Alternative B was chosen on 2026-10-31; the current version is `ARCHITECTURE.md`. This file remains as a record of the alternatives. Date: 2026-10-30.
> Scope: local prototype (no deployment, no auth). The repo's actual stack: Next.js **16.4.3**, React 19.3, TypeScript strict, Tailwind 4, **pnpm**, App Router in `apps/web/src/app`, `cacheComponents: true`.

## TL;DR

**Recommendation: Alternative B — feature modules ("screaming") with ports only at the edges.**
Each feature (`crew`, `risk`, `plan`, `space-weather`, `sentry`, `xr`) lives in its folder with types, pure logic, its server entry point (Data Access Layer) and its adapters. Interfaces are defined only where there will **really** be a swap: the repository (JSON → SQLite/FastAPI) and the external clients (real/mock). A single composition file picks adapters according to `.env`. No DI container, no use-case classes.

Why: it is the minimum that satisfies constraints 1 and 3 (swappable persistence and services) without the ceremony of a full hexagonal architecture, and the folder names tell what the product does, which helps a newcomer.

---

## 0. Findings about the current repo

| Finding | Impact |
|---|---|
| `soma/lib/soma.ts` does not exist; the scaffold is a freshly created Next.js in `apps/web` | The simulated data is created from scratch in Phase 0b |
| The project uses **pnpm** (`pnpm-lock.yaml`), not npm | Briefings must say `pnpm build`, not `npm run build` |
| `apps/web/.gitignore` ignores `.env*` | It would also ignore `.env.example`; `!.env.example` must be added |
| `cacheComponents: true` in `next.config.ts` | Changes how the JSON files are read (see §3.2). It is the most important technical constraint |
| `AGENTS.md` requires reading `node_modules/next/dist/docs/` | Every Next decision below cites those local docs (`D/` = `node_modules/next/dist/docs/01-app/`) |

---

## 1. Alternatives considered

### A. Next.js-style layers: `app/` + `lib/` with DAL and DTOs

```
apps/web/src/
  app/            page.tsx · sentry/page.tsx · xr/page.tsx · */actions.ts
  lib/
    dal/          crew.ts · risk.ts · plan.ts      # 'server-only', returns DTOs
    clients/      classifier.ts · llm.ts · nasa.ts
    store/        json-store.ts
    config.ts
  components/
apps/web/data/*.json
```

| Pros | Cons |
|---|---|
| Follows the official *Data Security* guide (`D/02-guides/data-security.md`) | `lib/` becomes a catch-all drawer |
| Minimal concepts, very fast start | The real/mock swap ends up as scattered `if`s, unless you add interfaces anyway |
| | The structure does not "scream" what the product does |

**Complexity:** low.

### B. Feature modules with ports at the edges (**recommended**)

```
apps/web/
  data/
    seed/            # starting JSON (versioned)
    runtime/         # live "database" (gitignored, created from seed)
    fixtures/        # sample responses for mocks (versioned)
  src/
    app/                         # thin routes: they only compose features
      page.tsx                   # "/"  mission web app
      sentry/page.tsx
      xr/page.tsx
      layout.tsx · error.tsx · not-found.tsx
    features/
      crew/
        crew.types.ts            # domain types + DTOs
        crew.logic.ts            # pure functions (testable)
        crew.repository.ts       # port (interface)
        crew.repository.json.ts  # JSON adapter
        crew.queries.ts          # read, 'server-only' (DAL)
        crew.actions.ts          # mutations, 'use server'
        components/              # feature UI
      risk/                      # classifier.port.ts · systemone.client.ts · classifier.mock.ts …
      plan/                      # planner.port.ts · ollama.client.ts · planner.mock.ts …
      space-weather/             # donki/swpc clients + mocks + cache
      sentry/
      xr/
    server/
      config.ts                  # reads and validates process.env (only place)
      services.ts                # composition: picks adapter according to config
      json-store.ts              # atomic read/write + mutex
    shared/
      result.ts · ui/
```

| Pros | Cons |
|---|---|
| The folders describe the product ("screaming architecture") | A bit more ceremony: interface + adapter at the edges |
| Swap JSON → SQLite/FastAPI = a new adapter + one line in `services.ts` | One rule must be respected: a feature does not import another's internals |
| Real/mock for Jev, LAYA, MedGemma, NASA with the same pattern | |
| Pure logic testable without Next or network | |
| A team member can "take ownership" of a folder | |

**Complexity:** low-medium.

### C. Full Hexagonal / Clean

```
src/domain/{entities,value-objects}/
src/application/{use-cases,ports}/
src/infrastructure/{persistence,http,llm}/
src/interface/next/
src/di/container.ts
```

| Pros | Cons |
|---|---|
| Maximum isolation | One use-case class per operation over JSON = boilerplate |
| | Classes do not cross the RSC boundary or the `'use cache'` serialization (`D/03-api-reference/01-directives/use-cache.md`), so they still have to be mapped to plain objects |
| | A DI container clashes with `'use server'` module exports |
| | Four layers to change a form: a bad experience for a newcomer at a hackathon |

**Complexity:** high. **Discarded:** it is excessive for a prototype. Cockburn himself clarifies that the hexagonal pattern does not require layers or DI; the value is in being able to run the app with mock adapters, and B already provides that.

---

## 2. Recommendation: B, lightweight version

Concrete rules:

1. **Domain = plain types + pure functions.** No classes. Everything that crosses to the client is a serializable object.
2. **Interfaces only where there is a real swap:** persistence repositories and the external clients (classifier, planner, space weather, radiation).
3. **A single composition root** (`src/server/services.ts`): reads `config.ts` and returns the adapters. No DI library.
4. **Thin routes.** `app/**/page.tsx` only composes feature components.
5. **Imports only go down:** `app → features → server/shared`. A feature does not import another's internals; if it needs something, it asks for it through its `*.queries.ts`.

---

## 3. How the constraints are addressed

### 3.1 JSON persistence and future migration (constraint 1)

- Each feature with data defines an async **repository** (`CrewRepository`) that returns domain types. The UI and the logic never know there is JSON behind it.
- Current adapter: `*.repository.json.ts` over `server/json-store.ts`.
- Migration: SQLite → `crew.repository.sqlite.ts`; FastAPI → `crew.repository.http.ts`. **One line** changes in `services.ts`. Neither the logic nor the UI is touched.
- Data in `apps/web/data/`, **outside `src/`**, read with `fs/promises` and `path.join(process.cwd(), 'data', …)`. **Never** `import x from './x.json'`: it puts it in the module graph and Next prerenders it into the static HTML (`D/01-getting-started/08-caching.md:393-400`).
- `data/seed/` (versioned) → `data/runtime/` (ignored). If a runtime file is missing it is copied from the seed; a `db:reset` script restores the state for the demo.

### 3.2 Reads with `cacheComponents: true` (critical)

**Verified in the local docs:** with Cache Components, synchronous I/O (`readFileSync`) runs during prerender and **gets frozen into the build HTML** (`08-caching.md:393-400`). An `await readFile()` counts as dynamic data, and must go inside `'use cache'` or behind `<Suspense>` (`:439`).

Decision:
- JSON repositories read with `fs/promises`, **without cache**. Pages wrap the components with data in `<Suspense>`. This way a change in the JSON shows up on the next request, with no invalidations to forget.
- `'use cache'` + `cacheLife` only for **read-only external data** (DONKI, SWPC), where it does help: it avoids hitting the API on every render.

### 3.3 Atomic write and concurrency

`server/json-store.ts`, about 40 lines, **no dependencies**:

1. Writes to `file.json.<pid>.<rand>.tmp` with `writeFile(..., { flush: true })`.
2. `rename(tmp, file)`. Node documents that `rename` overwrites the destination if it exists (nodejs.org/api/fs.html#fsrenameoldpath-newpath-callback).
3. **Windows:** retries the `rename` 3–5 times with a short backoff on `EPERM`, `EBUSY` or `EACCES`. An antivirus, the indexer or the editor can lock the file.
4. **In-process mutex per path** (`Map<path, Promise>`), which serializes the whole read-modify-write cycle. Node warns that it is not safe to call `writeFile` repeatedly on the same file without waiting (nodejs.org/api/fs.html#fspromiseswritefilefile-data-options).
5. The lock map lives on `globalThis`, to survive HMR module re-evaluation in dev. It is the pattern Prisma documents for Next.js.

Scope: this is enough for **a single local process**. With several processes it is not; see §6.

Alternative evaluated: `steno` (lowdb's writer), with atomic, ordered writes. `lowdb` adds an API that is not needed. I prefer zero dependencies.

### 3.4 Ports for Jev/LAYA, MedGemma and NASA (constraint 3)

| Port | Adapters | Selection |
|---|---|---|
| `RiskClassifier` | `SystemOneClient` (serves **Jev and LAYA**: same endpoint `POST /v1/systemone`), `MockClassifier` | `CLASSIFIER_PROVIDER=jev\|laya\|mock` |
| `CarePlanner` | `OllamaPlanner` (MedGemma 1.5 4B), `MockPlanner` | `PLANNER_PROVIDER=ollama\|mock` |
| `SpaceWeatherSource` | `DonkiClient` + `SwpcClient`, `FixtureSpaceWeather` | `SPACE_WEATHER_PROVIDER=live\|fixture` |
| `RadiationSource` | `FixtureRadiation` (RadLab), optional `RadlabClient` | `RADIATION_PROVIDER=fixture\|live` |

A **single** System One client for Jev and LAYA, parameterized by base URL, key, model map and thresholds. It is necessary because LAYA differs from Jev (details in `SERVICES.md`):
- it uses other model names;
- it has no `box` type;
- it requires a description on each `score` level;
- it computes `confidence` differently.

Every port response includes **`source: { provider, mode: 'live' | 'cache' | 'mock', fetchedAt }`**, and the UI always shows it. For the classifier, also the probabilities and an "uncalibrated" notice when the provider is LAYA.

`SOMA_OFFLINE=true` forces all ports to mock/fixture, to run the demo without internet.

### 3.5 Entities vs DTOs

- **Domain types** (`crew.types.ts`): the full shape the logic works with.
- **DTO**: what `*.queries.ts` hands to the UI. It is minimal, serializable and with derived fields already computed. It follows the DAL→DTO pattern from the official docs (`D/02-guides/data-security.md`).
- In a prototype, DTOs are created **only when the UI shape differs from the domain**. They are not duplicated out of ritual.

### 3.6 Errors

| Type | Handling |
|---|---|
| Expected (validation, service down) | A `Result<T>` is returned (`{ ok: true, value } \| { ok: false, error }`), without throwing. Next recommends modeling expected Server Action errors as return values (`D/01-getting-started/10-error-handling.md`) |
| External service fails | Fallback chain **live → last cache on disk → fixture**, with `source.mode` visible in the UI |
| Unexpected bug | Thrown; caught by the route's `error.tsx` |
| Nonexistent resource | `notFound()` + `not-found.tsx` |

### 3.7 Input validation

Every external input is validated on the server: Server Action forms, environment variables and responses from Jev/LAYA/Ollama/NASA. Server Actions can be invoked by direct POST (`D/02-guides/data-security.md`).

| Option | Pros | Cons |
|---|---|---|
| **Zod v4** (recommended) | A single tool for env, actions and external responses. It appears in Next's forms guide (`D/02-guides/forms.md`). Runs on the server, so size does not matter | **New dependency**: today it is only a transitive dependency of ESLint and cannot be imported |
| Valibot | Very small | Less familiar to the team |
| Hand-written guards | Zero dependencies | Error-prone with nested payloads (NASA, LLM) |

→ **I ask for your approval** for `zod` (see open questions).

### 3.8 Server vs client

| Runs on the server | Runs on the client |
|---|---|
| JSON read/write, all external adapters, API keys, `config.ts` | Interaction: Sentry chat/check-in, XR stepper, charts, TTS (Web Speech API) |
| Pages (Server Components by default) | Only interactive leaves with `'use client'` |

- `import 'server-only'` in `*.queries.ts`, `services.ts` and the adapters. Next resolves it internally, with no npm package (`D/02-guides/data-security.md`).
- Environment variables **without** `NEXT_PUBLIC_`, read only in `server/config.ts`.

### 3.9 Constraints 4–6

- **(4) Ray-Ban Meta:** changed in 2026. Regular Ray-Ban Meta still have **no display** (camera and audio via the Wearables Device Access Toolkit). The **Meta Ray-Ban Display** have display access in *developer preview* since May 2026 (600×600 UI pushed from a phone app). Neither option talks directly to Next.js. **Decision:** the visual guide stays on Quest 3. In the prototype, `/xr` simulates the steps on the web.
- **(5) Dependencies:** proposed, pending your approval: `zod` (runtime) and `vitest` (dev, optional). Nothing else.
- **(6) If it is ever deployed** (do not do it now):
  - JSON → SQLite/Postgres: the serverless FS is ephemeral and multi-instance.
  - Secrets in a manager.
  - Ollama on a GPU host.
  - Authentication.
  - A distributed mutex or a transactional DB.

---

## 4. How to add a new feature (short guide)

1. **Folder:** `src/features/<name>/`.
2. **Types:** `<name>.types.ts` with plain types (and a DTO only if the UI needs a different shape).
3. **Logic:** pure functions in `<name>.logic.ts`, testable without Next.
4. **Does it persist data?** Define `<name>.repository.ts` (interface) and `<name>.repository.json.ts`, with a seed in `data/seed/<name>.json`.
5. **Does it call an external service?** Create the port, the real adapter, the mock and its fixture in `data/fixtures/`. Register it in `server/services.ts` and its variables in `server/config.ts` and `.env.example`. Document it in `docs/SERVICES.md`.
6. **Read:** `<name>.queries.ts` with `import 'server-only'`, returning DTOs.
7. **Mutation:** `<name>.actions.ts` with `'use server'`. Validate the input and return `Result`.
8. **UI:** `components/` inside the feature. `'use client'` only on interactive leaves.
9. **Route:** `app/<route>/page.tsx` composes the components; dynamic data goes inside `<Suspense>`.
10. **Verify:** `pnpm build` green and the feature tried with `SOMA_OFFLINE=true`.

---

## 5. Not verified

- Whether renaming over a locked file in Windows returns exactly `EPERM`, `EBUSY` or `EACCES` (Node does not document it for Windows).
- That writing to `data/runtime/*.json` never triggers a Turbopack reload if it is not imported. It is an inference; it gets validated in Phase 0b.
- The exact format of the `laya-serve` response: the README says "schema-identical", but there is no published example.
- Whether Jev still has a waitlist to get a key.
- Service details: see the "Not verified" section of `SERVICES.md`.

## 6. Open questions

1. Do you approve **alternative B**?
2. Do you approve `zod` as a dependency (and `vitest` as a devDependency for pure logic and adapters)?
3. Should `ORCHESTRATOR.md` be created with the instructions document? The subagent briefing references it and today it does not exist.
4. Do you already have a Jev key (`TYPESAFE_API_KEY`)? Without it, the demo starts on `laya` or `mock`.
5. Can the demo machines run Ollama with MedGemma 1.5 4B (about 3.3 GB) and LAYA (Python 3.10+, about 2.3 GB of weights)?
6. A *naming* detail: "SOMA" is already the *Space Omics and Medical Atlas* (Weill Cornell / OSDR, Inspiration4 data). It may confuse the jury; a line in the pitch is advisable.

## Sources

- Local Next.js 16.4.3 docs (`apps/web/node_modules/next/dist/docs/01-app/`):
  - `01-getting-started/02-project-structure.md`
  - `05-server-and-client-components.md`
  - `07-mutating-data.md`
  - `08-caching.md`
  - `09-revalidating.md`
  - `10-error-handling.md`
  - `02-guides/data-security.md`
  - `02-guides/forms.md`
  - `02-guides/environment-variables.md`
  - `03-api-reference/01-directives/use-cache.md`
- Node.js fs: https://nodejs.org/api/fs.html
- Hexagonal (Cockburn): https://alistair.cockburn.us/hexagonal-architecture/
- Feature-Sliced Design: https://feature-sliced.design/docs/get-started/overview
- bulletproof-react (community reference, not official): https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md
- Prisma + Next.js (singleton on `globalThis`): https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
- steno: https://github.com/typicode/steno
- Zod mini: https://zod.dev/packages/mini · Valibot: https://valibot.dev/
- External services: see `docs/SERVICES.md`
