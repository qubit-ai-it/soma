Objective: implement Alternative B (feature modules, ports at the edges) and one crew vertical slice. Branch: feature/prototype. Delivery: no commits until the user approves. Runner: `node --test` (Node 24) + `pnpm build`.

## Specs

- S1: "Minimum deliverable: approved structure, final docs/ARCHITECTURE.md and docs/SERVICES.md, .env.example and mocks, and an example vertical slice (crew: JSON data → UI) that serves as a model for the other features."
- S2: Structure per docs/ARCHITECTURE_PROPOSAL.md alternative B: `src/app` thin routes, `src/features/<name>`, `src/server/{config,services,json-store}.ts`, `src/shared`. JSON data in `apps/web/data/{seed,runtime,fixtures}`, read with `fs/promises` and never imported.
- S3: Dependencies: `zod` approved; `vitest` NOT approved, tests use `node:test` ("Yes, exactly. Let's continue.").
- S4: `.env.example` must be committable (`!.env.example` in .gitignore); `data/runtime` ignored.
- S5: "Every external service has a mock or fixture. With `SOMA_OFFLINE=true` the prototype runs completely without internet or keys."
- S6: "Every clinical output shows uncertainty and requires human validation."
- S7: Use `pnpm build` (repo uses pnpm), not `npm run build`.
- S8: Never commit, push or merge without explicit approval.

## Tasks

- [~] T1 (S3,S4,S7) zod 4.6.7, scripts, gitignore done; `.env.example` BLOCKED (write denied by permission settings) — inline
- [x] T2 (S2) server layer: config, json-store (+5 tests, RED observed: sync throw on invalid name), shared/result — inline
- [x] T3 (S1,S2) crew slice: seed, schema, types, logic (+4 tests), json repo (+2 tests), queries, UI, route; `pnpm build` green, live edit of data/runtime verified with `next start` — inline
- [x] T4 (S5,S6) ports + mocks/fixtures for risk, plan, space-weather, radiation; services.ts — inline
- [x] T5 (S1) docs/ARCHITECTURE.md, docs/SERVICES.md definitive; proposal marked superseded — inline
- No commits (S8).

## Log

- L1 (2026-10-31, user): "We will choose alternative B." + pasted workflow (Phase 0b: "Only after my decision... Minimum deliverable: ..."; Phase 1 FEATURES.md; Phase 2/3 herdr + review/commit; standing rules).
- L2 (2026-10-31, user): zod yes, vitest no: "Yes, exactly. Let's continue."
- Route: all tasks inline (single understood change, no parallel-writer reason).
