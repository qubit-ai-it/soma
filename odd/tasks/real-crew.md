# Real crew from registered users

Objective: crew members come from users who register with Clerk; no mock crew; vitals generated within plausible thresholds.
Branch: feat/real-crew. Delivery: ask-on-risk (no push to main until approved). Test runner: `pnpm test` in apps/web.

## Specs

- S1: "the UI should already bring the user's report, extracting their first name and last name."
- S2: "The whole flow must be per user and no longer mock."
- S3: "when creating reports, the data that cannot be obtained will be generated randomly, within thresholds that make sense."
- S4: "the Crew chats, and everything, must really pull the members who register into the crew. No mocked data for Amara, Mateo Quispe, Yuki Tanabe and the ones that exist."
- S5 (assumption): crew roles are astronaut, cmo and commander; the earth role is not crew.
- S6 (assumption): seeded alerts, audit entries and Earth proposals that point at cm-01..cm-04 are removed; scenario JSON stays as test fixtures.
- S8: "Everything must belong to the user: their conversations with Sentry, Notifications, Report, Devices. That is, nothing may be shared between users."
- S7 (open): Neon holds the old seeded rows and needs a migration (0006) plus a cleanup; both need the user's go-ahead to touch production.

## Tasks

- [ ] T1 (S1, S2) crew_members migration, generator, Postgres repository, registration sync (inline)
- [ ] T2 (S1) member id in the session; nav, role home, alert tray use it (inline)
- [ ] T3 (S4) simulation and Crew chats driven by the repository (delegated unit)
- [ ] T4 (S2, S3) Sentry engine, live subject and observations per real member (delegated unit)
- [ ] T7 (S8) per-user isolation: scoped local storage, session-derived notification viewer, own-report access check, device ingest bound to the member (delegated unit)
- [ ] T5 (S6) remove mock crew and seeded cm-0X data (inline)
- [ ] T6 verification, commit, push

## Log

- L2 (2026-11-16, translated from Spanish) "Everything must belong to the user: their conversations with Sentry, Notifications, Report, Devices. That is, nothing may be shared between users."

- L1 (2026-11-16, translated from Spanish) "Done, commit and push. Now, the UI should already bring the user's report, extracting their first name and last name. The whole flow must be per user and no longer mock. In short, when creating reports, the data that cannot be obtained will be generated randomly, within thresholds that make sense. And the Crew chats, and everything, must really pull the members who register into the crew. No mocked data for Amara, Mateo Quispe, Yuki Tanabe and the ones that exist."
