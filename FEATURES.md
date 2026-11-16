# Features — Soma

> Status: **Phase 1 proposal, pending your choice**. Architecture: `docs/ARCHITECTURE.md`. Services: `docs/SERVICES.md`.
> Sizes: **S** ≈ 1 short session · **M** ≈ half a day · **L** ≈ more than a day. They are estimates, not measurements.
> Rules common to all: `pnpm test`, `pnpm lint` and `pnpm build` green; tried with `SOMA_OFFLINE=true`; every clinical output shows uncertainty and requires human validation; external integrations with a real version and a mock.

## Changes from the initial list

- **Feature 1:** the crew cards already exist (Phase 0b vertical slice). What remains is the history, the trends and the mission web app design. The risk badge plugs in at feature 2, not here.
- **Feature 8** drops to **S**: `SOMA_OFFLINE`, the mocks and the fixtures already exist. What is missing is the fallback chain, the UI notice and end-to-end verification.
- **Feature 6** is split into two internal steps (state engine first, immersive view later). It is still a single feature.
- **Routes (task 1b ✅):** information is distributed across routes according to `docs/ROUTES.md`: `/` summarizes the mission and `/report/[id]/...` has one tab per topic. Features 3 to 9 add their route following that table.
- **Suggested order:** 1 → 2 → 3 → 4 → 5 → 7 → 6 → 8 → 9. Feature 6 goes late because it is the biggest and does not block the others.

---

## 1. ✅ Mission web app: crew, trends and body map · L · no dependencies

- **Goal:** make `/` the mission dashboard: crew cards, vital sign trends and, for each member, a body map with the zones painted by severity: **green** = all good, **amber** = possible risk, **red** = risky.
- **Library:** [OrganUI](https://organui.com/) (MIT), `BodyMap` component. Verified in its documentation: it is not an npm package, it is installed as **source code** with the shadcn CLI (`shadcn add @organui/body-map`, or `https://organui.com/r/body-map.json`); it requires React 19 and Tailwind 4; it brings the dependencies `@base-ui/react`, `class-variance-authority` and `cn`, and shadcn's `button` component. `BodyMap` is a **region selector** (front and back views, keyboard accessible): it **has no color or severity prop**, and its docs say to edit the installed code to shade by severity.
- **Expected files:** `components.json`, `src/shared/ui/{body-map,button}.tsx` (+ `src/shared/lib/utils.ts` if shadcn asks for it), `data/seed/crew.json` (with history), `features/crew/{crew.schema,crew.types,crew.logic}.ts` (trends and severity per zone), `features/crew/components/{trend-chart,body-status,mission-header}.tsx`, `app/page.tsx`, `app/layout.tsx`.
- **Acceptance criteria:**
  1. Each card shows the trend of at least 3 signals (heart rate, SpO₂, sleep) from the seed history; the trend function is pure and has tests (rising, falling, stable, insufficient data).
  2. Each member has a body map (OrganUI `BodyMap`, front and back) with their zones in green, amber or red, computed by a pure function with tests (per signal: `ok` / `possible risk` / `risky`; per zone: the worst of the signals that affect it).
  3. Selecting a zone shows which signals and values painted it, with the notice "illustrative, not clinical". Color is never the only channel: each zone and legend carries text (`All good`, `Possible risk`, `Risky`).
  4. The history is validated with Zod; a malformed JSON produces the `error.tsx` error, not a broken screen. No horizontal scroll at 375 px.
  5. OrganUI installed as source code under `src/shared/ui` (alias in `components.json`), respecting `docs/ARCHITECTURE.md`; new dependencies listed with their version in `REPORT.md`; `pnpm test`, `pnpm lint` and `pnpm build` green.
- **Assumptions (to be validated by the user):**
  - Illustrative signal → zone mapping: SpO₂ and heart rate → chest; sleep → head; cumulative dose → abdomen and pelvis.
  - Two thresholds per signal (amber and red). Amber keeps today's: SpO₂ < 94, HR > 100, sleep < 6 h, dose > 100 mSv. Red: SpO₂ < 90, HR > 120, sleep < 4 h, dose > 150 mSv. None of them is clinical guidance.
- **Out of scope:** risk classification (feature 2), data writes, alerts, authentication, OrganUI's 3D organ models.

## 2. ✅ Risk classification (Jev, LAYA, mock) · M · depends on 1

- **Goal:** classify risk per crew member with the `RiskClassifier` port and show it on the card with its uncertainty.
- **Expected files:** `features/risk/{systemone.client,classifier.laya,classifier.jev}.ts`, `risk.logic.ts` (questions and thresholds per provider), `risk.queries.ts`, `components/risk-badge.tsx`, `server/services.ts`, `server/config.ts`.
- **Acceptance criteria:**
  1. A single System One client serves Jev and LAYA, parameterized by URL, key, model map and thresholds.
  2. The fallback chain is Jev → LAYA → mock, and the UI shows `source.provider` and `source.mode`.
  3. LAYA classifications carry the label "local fallback · uncalibrated" (`calibrated: false`).
  4. Probabilities and confidence are shown, not just the label.
  5. Provider responses are validated with Zod; 401/429/529 are handled without throwing (`Result`).
- **Out of scope:** recalibrating LAYA, training models, using the `box` type, storing a history of classifications.
- **Known risk:** the exact JSON of `laya-serve` is not verified (see `SERVICES.md`). The first task is a real call or a contract test.

## 3. ✅ Plan or treatment with MedGemma and fallback · M · depends on 2

- **Goal:** generate a routine or treatment draft from the risk and the signals, with a mandatory human validation notice.
- **Expected files:** `features/plan/{ollama.client,planner.schema}.ts`, `plan.actions.ts` or `plan.queries.ts`, `components/care-plan.tsx`, `data/fixtures/plan.json`, `app/report/[id]/plan/page.tsx` ("Plan" tab).
- **Acceptance criteria:**
  1. The model output is requested with `format: <JSON schema>` and validated with Zod before being shown.
  2. Every plan shows "Draft · requires human validation" and the `uncertainty` field; the type does not allow `requiresHumanValidation: false`.
  3. If Ollama does not respond, it falls back to the fixture plan and the UI says so (`source.mode`).
  4. A test proves that a response that does not meet the schema is rejected.
  5. With `SOMA_OFFLINE=true` no connection to Ollama is attempted.
- **Out of scope:** medical history, drug interactions, any claim of clinical use.

## 4. Space weather and radiation (DONKI, SWPC, RadLab) · L · depends on 1

- **Goal:** show the space weather status and the radiation dose, with cache and fallback data.
- **Expected files:** `features/space-weather/{donki.client,swpc.client,space-weather.queries}.ts`, `radiation.fixture.ts`, `components/*`, `data/runtime/cache/` (ignored), `scripts/make-radiation-fixture.ts`.
- **Acceptance criteria:**
  1. DONKI requests at most 30 days (the API limit is 60) and is cached with `'use cache'` + `cacheLife`.
  2. The fallback chain is live → last response on disk → fixture, and the UI shows the mode.
  3. SWPC provides GOES protons, Kp and alerts, validated with Zod.
  4. RadLab data is labeled as historical (data up to ~2024) and not as "live".
  5. The script regenerates a RadLab fixture with a real 24 h window.
- **Out of scope:** predicting events, modeling per-crew-member dose from weather.
- **Known risk:** the unit of `absorbed_dose_rate` is assumed (µGy/h), unverified.

## 5. Sentry: adaptive check-in · M · depends on 2

- **Goal:** a conversational check-in that starts simple and increases in complexity only when there is a signal.
- **Expected files:** `features/sentry/{sentry.logic,sentry.types,sentry.actions}.ts`, `components/{checkin-chat,voice-toggle}.tsx`, `app/sentry/page.tsx`.
- **Acceptance criteria:**
  1. The escalation logic is pure and has tests: no signal, 1 question; with a signal, follow-up questions.
  2. Responses are validated on the server with Zod (Server Actions can be invoked by direct POST).
  3. Voice uses the Web Speech API only with `voice.localService === true` if there is no network; without voice, there is text.
  4. The check-in result feeds the risk classification through the port, without importing another feature's internals.
  5. Operable with only a keyboard and with a screen reader.
- **Out of scope:** diagnosis, cloud voice, audio recording.

## 6. AR/VR procedures engine · L · depends on 1

- **Goal:** a step and state engine for guided procedures, with practice mode and live mode, simulated on the web (`/xr`).
- **Expected files:** `features/xr/{procedure.types,procedure.schema,procedure.machine}.ts`, `data/seed/procedures.json`, `components/stepper.tsx`, `app/xr/page.tsx`.
- **Acceptance criteria:**
  1. The state machine is pure and has tests: advance, go back, skip, fail a step, complete.
  2. Practice vs. live: in practice mode it can be restarted and nothing is recorded; in live mode each step is recorded.
  3. Procedures are loaded from JSON validated with Zod.
  4. `/xr` simulates the steps on the web; there are no dependencies on Unity or the Meta SDK.
  5. The state survives a page refresh.
- **Out of scope:** Quest 3 app, Ray-Ban Meta, hand tracking, spatial anchoring.
- **Decision made:** the real visual guide targets Quest 3 (regular Ray-Ban Meta have no display).

## 7. Alerts and escalation with an audit log · M · depends on 2

- **Goal:** escalate to the onboard physician or to Earth according to risk, and leave a tamper-proof record of who did what.
- **Expected files:** `features/alerts/{alerts.types,alerts.logic,alerts.repository,alerts.repository.json,alerts.actions,alerts.queries}.ts`, `data/seed/alerts.json`, `data/seed/audit.json`, `components/*`.
- **Acceptance criteria:**
  1. Escalation rules are pure functions with tests (risk level → recipient).
  2. Each alert and each action (acknowledge, escalate, close) adds an entry to the log; entries are only appended, never edited.
  3. Acknowledging or closing an alert requires an identified human; the system does not close alerts on its own.
  4. Safe concurrent writes with `json-store` (test with simultaneous actions).
  5. The log is visible and exportable to JSON.
- **Out of scope:** push or email notifications, integration with real Earth systems, real authentication.

## 8. Degraded offline mode · S · depends on 2, 3 and 4

- **Goal:** ensure and make visible that the app works without internet or keys.
- **Expected files:** `server/services.ts`, `components/offline-banner.tsx`, `docs/SERVICES.md`, composition tests.
- **Acceptance criteria:**
  1. With `SOMA_OFFLINE=true`, no route attempts a network connection (verified by cutting the network).
  2. A global banner indicates the mode and which data is fallback data.
  3. A failed external service degrades only that feature; the rest of the page keeps working.
  4. A test checks that `SOMA_OFFLINE` wins over every `*_PROVIDER` variable.
  5. `pnpm db:reset` leaves the state ready for the demo.
- **Out of scope:** later synchronization, PWA or service worker.

## 9. Demo mode for the pitch · M · depends on 1 to 8

- **Goal:** a guided 3-minute scenario, repeatable and with no surprises.
- **Expected files:** `features/demo/{demo.script,demo.logic}.ts`, `data/seed/demo-scenario.json`, `components/demo-controller.tsx`, `app/demo/page.tsx`.
- **Acceptance criteria:**
  1. The script has timed steps and is navigated with the keyboard (advance, go back, restart).
  2. The scenario runs completely with `SOMA_OFFLINE=true` and returns to the initial state with one command.
  3. The interface distinguishes demo data from real data.
  4. A test walks through the entire script and checks that all steps reference existing data.
  5. You can jump to any step without breaking the state.
- **Out of scope:** video recording, automatic narration, analytics.

---

## Open decisions (affect several features)

1. **Resolved:** `ORCHESTRATOR.md` created at the root.
2. **Resolved for now:** there is no Jev key. Jev and MedGemma are **simulated with random data** (`simulated-jev`, `simulated-medgemma`). Features 2 and 3 use those simulations as the default provider; the real clients are added when there is a key and hardware.
3. **Pending (no longer blocking):** can the demo machines run Ollama with MedGemma 1.5 4B (about 3.3 GB) and LAYA (about 2.3 GB)? It only matters for moving from the simulation to the real providers.
4. **Pending:** the name "SOMA" coincides with the *Space Omics and Medical Atlas* (Weill Cornell / OSDR). A line in the pitch is advisable (feature 9).
