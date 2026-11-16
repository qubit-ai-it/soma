# Translate the whole project to English

Objective: no Spanish left anywhere in the repository (UI, code, comments, data, docs, routes).
Branch: feat/english-translation. Delivery: ask-on-risk (no push until the user approves). Test runner: `pnpm test` in apps/web.

## Specs

- S1: "Now translate everything, the whole project, to English, not a trace of Spanish may remain."
- S2: The onboarding hero reads exactly: "I'm Sentry" / "Your intelligent health assistant in space."
- S3: "Let's try to sell Sentry, like in the onboarding, it's an idea, you adapt it: I integrate crew health, capabilities, and available resources to anticipate risks, support emergency response, and strengthen medical preparedness" (assumption: used as the onboarding pitch, split across two steps because the onboarding test caps each line at 14 words).
- S4 (assumption): Spanish URL segments and API paths are renamed to English (report, earth, mission, devices, status, evaluation, follow-up, api/simulation, api/notifications, api/ingest).
- S5 (assumption): `pnpm test`, `tsc --noEmit` and `pnpm build` pass; a sweep for Spanish words and accents finds nothing in tracked files.
- S6 (open): Neon already holds Spanish seed rows; re-seeding is destructive and needs the user's OK after the code lands.

## Tasks

- [x] T1 (S4) rename routes and API paths, inline.
- [x] T2 (S1) translate features and app UI in parallel units, delegated (five writers, disjoint surfaces).
- [x] T3 (S1) translate docs, seed data and fixtures (audit hash chain recomputed).
- [x] T4 (S2, S3) onboarding hero and pitch, inline.
- [ ] T5 (S5) verification and sweep.

## Log

- L1 (2026-11-15, translated from Spanish) "Now translate everything, the whole project, to English, not a trace of Spanish may remain. I'm Sentry / Your intelligent health assistant in space. Also, let's try to sell Sentry, like in the onboarding, it's an idea, you adapt it: I integrate crew health, capabilities, and available resources to anticipate risks, support emergency response, and strengthen medical preparedness"
