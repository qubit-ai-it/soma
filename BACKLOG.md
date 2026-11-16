# BACKLOG.md — SOMA toward the demo flow

> Derived from `FLOW.md` and the repo state as of 2026-11-15. Sizes: **S** ≈ short session · **M** ≈ half a day · **L** ≈ more than a day (estimates, not measurements).
> Assumption to confirm: the demo's thread case is **fatigue and reduced sleep with an HRV change**.

## Current status

| Area | Status |
|---|---|
| Mission web app: crew, trends, body map (F1) | ✅ done |
| Jev/LAYA/mock risk classification (F2) | ✅ done, with `simulated-jev` simulation |
| Plan with MedGemma/Ollama and fallback (F3) | ✅ done, with `simulated-medgemma` simulation |
| Space weather (F4) | Only ports and fixtures on this branch. `feat/04-space-weather` exists, not integrated |
| Sentry / `/pet` | Assistant with chat (Gemini), hands-free voice, image attachments, history and tasks |
| XR procedures engine (F6) | Does not exist |
| Alerts and audit (F7), offline (F8), demo mode (F9) | Do not exist |
| Design | Tokens, dark theme and restyle done |
| **Deterministic engine (baseline, F0–F3, `NOT_EVALUABLE`)** | **Does not exist.** Today there are amber/red thresholds per signal in `crew.logic.ts` |
| **Roles, Earth, store-and-forward, follow-up** | **Do not exist** |

What weighs the most: the heart of the document (the deterministic engine) is not built yet.

## Backlog (ordered by dependency)

### A. Deterministic core
| # | Task | Size | Depends on |
|---|---|---|---|
| A1 | `Observation` model with provenance and quality (types + Zod + tests) | S | — |
| A2 | Personal baseline and `baseline_delta` (pure, with tests; freezable during treatment) | M | A1 |
| A3 | Versioned rules engine: F0–F3 and `NOT_EVALUABLE`, persistence, linked evidence (pure, with edge tests) | L | A1, A2 |
| A4 | Synthetic dataset of the thread case, separate from the rules (avoids circular validation) | M | A1 |

### B. Plan and protocols
| # | Task | Size | Depends on |
|---|---|---|---|
| B1 | Library of pre-approved protocols (JSON + Zod), editable by "Earth" | M | — |
| B2 | Adapt the plan (F3): immediate pre-approved steps vs. draft pending validation | M | A3, B1 |
| B3 | Protocol router with a System One-type provider (`choice`) | S | B1 |

### C. Follow-up
| # | Task | Size | Depends on |
|---|---|---|---|
| C1 | Follow-up contract and states `improving / stable / worsening / NOT_EVALUABLE` with hysteresis | M | A3, B2 |
| C2 | Adherence (steps and XR sessions) and structured self-report (`score`) | M | C1 |

### D. XR
| # | Task | Size | Depends on |
|---|---|---|---|
| D1 | Procedures engine (F6, step 1): pure state machine | M | — |
| D2 | Quest detection with WebXR and simulated fallback in `/xr` | M | D1, H5 |
| D3 | Capture (ultrasound): image upload, quality assessment, returns as `Observation` | M | A1, D1 |
| D4 | Preliminary findings with an LLM and a guardrail (`noul`): never a diagnosis | M | D3 |

### E. Ecosystem
| # | Task | Size | Depends on |
|---|---|---|---|
| E1 | Roles: astronaut, CMO, commander, Earth, with minimal views and permissions (mock, no real auth) | M | — |
| E2 | Store-and-forward queue with idempotency and acknowledgement | L | A1 |
| E3 | Earth console: approve / modify / reject proposals | M | E1, E2, B2 |
| E4 | F3 alerts and append-only audit log (F7) | M | A3, E1 |

### F. Integrations
| # | Task | Size | Depends on |
|---|---|---|---|
| F1 | Space weather: review and integrate `feat/04-space-weather` (F4) | L | — |
| F2 | Swappable providers: Jev, LAYA, self-hosted, Gemini, MiniMax, MedGemma, with provider and version recorded | M | — |
| F3 | Verify Jev's self-hosted ("Kev") and write its adapter | S | F2 |
| F4 | Passive Sentry: receives evidence from the engine, explains and drafts. It does not decide | M | A3 |

### H. Devices and sync
| # | Task | Size | Depends on |
|---|---|---|---|
| H1 | `SourceAdapter` interface + simulator (always available) and history importer | M | A1 |
| H2 | BLE heart rate adapter (Web Bluetooth) for the smartwatch, with `provenance: real` and fallback to the simulator | M | H1 |
| H3 | Device registry (`id`, type, role, status, last contact) and "Devices" panel | M | H1 |
| H4 | Dashboard ↔ XR sync channel (SSE or local WebSocket): the server is the source of truth for procedure state; pairing by code or QR | L | H3, D1 |
| H6 | Per-device capability profile and experience selection (immersive on XR, 2D on laptop or phone, compact on watch) | M | H3 |
| H5 | Local HTTPS for WebXR (development certificate) and verification on the Quest | S | — |

### G. Wrap-up
| # | Task | Size | Depends on |
|---|---|---|---|
| G1 | Visible offline mode (F8): fallback chain and banner | S | F2 |
| G2 | Demo mode (F9): script of the 11 steps of `FLOW.md`, repeatable and offline | M | everything above |

## Where to start

1. **A1 → A2 → A3 → A4.** Everything else depends on the engine and the thread case data.
2. In parallel, **D1** and **E1** depend on nothing and can progress without colliding.
3. Then **B → C → E2/E3**, and at the end **D2–D4**, **G**.

First demonstrable cut: A1–A4 with a view showing F0 → F1 → F2 with evidence.

## Risks and pending items

- **Kev:** I could not confirm it. Jev's documentation says there is no self-hosting. Only one uncorroborated source mentions an open replica called NanoJev. Meanwhile, LAYA covers the local fallback with the same protocol. See F3.
- Thresholds and rules: they are for demonstration and must be declared as the project's own.
- Criteria for `improving` / `worsening` and for hysteresis undefined (C1).
- Real content of the protocol library undefined (B1).
- Branches `feat/01`–`feat/04` and `feature/sentry-*` not integrated into `main`; it is worth deciding which ones get merged.
