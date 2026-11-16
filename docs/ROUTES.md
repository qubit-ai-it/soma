# Routes — Soma

> Route names, code and interface text are all in English. Routes live in `apps/web/src/app/`.

## Route table

| Route | What it shows | Status |
|---|---|---|
| `/` | Role home: the entry point for the active role | Done |
| `/mission` | Mission dashboard and the simulation console | Done |
| `/report/[id]` | Crew member summary: current vital signs and flags | Done |
| `/report/[id]/status` | Current status of the crew member | Done |
| `/report/[id]/evaluation` | Evaluation board: signals, checkpoints and limitations | Done |
| `/report/[id]/plan` | Care plan: draft, board review and Earth review | Done |
| `/report/[id]/follow-up` | Follow-up contract and window reports | Done |
| `/devices` | Devices and XR experiences | Done |
| `/earth` | Earth console: packet queue, plan reviews and follow-up reports | Done |
| `/pet` | Sentry assistant: chat, tasks and history | Done |

A nonexistent `id` on any `/report/[id]` route renders `not-found.tsx` (see "Limits").

## Structure of `/report/[id]`

- `layout.tsx` draws the header (name, role, attention), the link back to `/` and the tabs (`report-tabs.tsx`, with `aria-current="page"` on the active one).
- Each tab shows one thing and comes from a component of its feature.
- `getMissionMember(id)` is wrapped in React's `cache()`: the layout and the page of the same request share a single read.
- Risk classification is requested only where it is shown: `/` classifies the whole crew once; the risk panel only that crew member. The other tabs do not call it (the mock's classification is random).

## How to add a route

1. Create `src/app/<route>/page.tsx` (or `report/[id]/<tab>/page.tsx` for a crew member tab).
2. The page only composes: it requests the data through the feature's `*.queries.ts` and renders its components. A feature does not import another; if the route needs two, the composition lives in `app/`.
3. With dynamic `params` and no `generateStaticParams`, `params` is a `Promise` and reading it goes inside `<Suspense>` (also in layouts). Pattern: the synchronous page returns `<Suspense><Content params={params} /></Suspense>` and `Content` does `await params`. Reference: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`, section "With Cache Components".
4. If the resource may not exist, call `notFound()` after the read.
5. If it is a tab of `/report/[id]`, add it to `TABS` in `report-tabs.tsx` (the `segment` is the folder name).
6. Show the source (`provider · mode`) and the simulation labels, and require human validation on every clinical output.
7. Update this table and verify with `pnpm test`, `pnpm lint` and `pnpm build` (the build lists the routes).

## Limits

- With `cacheComponents`, the HTTP status for a nonexistent `id` is 200: the response has already started being sent when `notFound()` runs. The HTML carries the not-found UI and `noindex`. Verified with `curl` against `next start`.
- None of this has been seen in a browser.
