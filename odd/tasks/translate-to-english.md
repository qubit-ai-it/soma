# Translate the whole project to English

Objective: no Spanish left anywhere in the repository (UI, code, comments, data, docs, routes).
Branch: feat/english-translation. Delivery: ask-on-risk (no push until the user approves). Test runner: `pnpm test` in apps/web.

## Specs

- S1: "Ahora traduce todo, todo el proyecto, al inglés, no debe quedar ni un rastro de español."
- S2: The onboarding hero reads exactly: "I'm Sentry" / "Your intelligent health assistant in space."
- S3: "tratemos de vender a Sentry, como en el onboarding, es una idea, tu ya adpatalo: I integrate crew health, capabilities, and available resources to anticipate risks, support emergency response, and strengthen medical preparedness" (assumption: used as the onboarding pitch line under the hero).
- S4 (assumption): Spanish URL segments and API paths are renamed to English (reporte→report, tierra→earth, mision→mission, estado→status, evaluacion→evaluation, seguimiento→follow-up, api/simulacion→api/simulation, api/notificaciones→api/notifications).
- S5 (assumption): `pnpm test`, `tsc --noEmit` and `pnpm build` pass; a sweep for Spanish words and accents finds nothing in tracked files.
- S6 (open): Neon already holds Spanish seed rows; re-seeding is destructive and needs the user's OK after the code lands.

## Tasks

- T1 (S4) rename routes and API paths, inline.
- T2 (S1) translate features and app UI in parallel units, delegated.
- T3 (S1) translate docs, seed data and fixtures.
- T4 (S2, S3) onboarding hero and pitch, inline.
- T5 (S5) verification and sweep.

## Log

- L1 (2026-11-15) "Ahora traduce todo, todo el proyecto, al inglés, no debe quedar ni un rastro de español. I'm Sentry / Your intelligent health assistant in space. Además, tratemos de vender a Sentry, como en el onboarding, es una idea, tu ya adpatalo: I integrate crew health, capabilities, and available resources to anticipate risks, support emergency response, and strengthen medical preparedness"
