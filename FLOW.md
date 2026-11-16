# FLOW.md — SOMA demo flow (draft to refine)

> Research and decision-support prototype. Demo data is synthetic or historical and must be labeled as such. Thresholds are the project's own demonstration rules.

## Roles

| Role | What it does | What it sees |
|---|---|---|
| **Astronaut** | Uses the dashboard, follows the plan, runs guided procedures in XR | Their own data |
| **Onboard medical officer (CMO)** | Reviews crew evidence, confirms or dismisses actions, can escalate manually | Crew evidence, with extended permission |
| **Commander** | Receives operational impact | Summary without clinical detail |
| **Supervisor / Earth physician** | Curates the protocol library before the mission, validates or modifies proposals via store-and-forward | Synced packages |
| **Auditor / scientist** (optional) | Reviews rules, versions and traceability | Read-only, pseudonymized data |
| **Sentry** (assistant) | Communicates, explains and drafts. It does not decide | Structured evidence handed to it by the engine |

Privacy: F0–F2 are seen only by the astronaut and the CMO. F3 is the exception: the crew and Earth are notified with the bare minimum (status and action).

## Main flow

1. **Data.** Wearables, IoT, DONKI and self-report enter the dashboard with provenance (real / historical / synthetic) and quality.
2. **Deterministic engine.** Analyzes passively with an individual baseline, persistence and versioned rules. Returns F0–F3 or `NOT_EVALUABLE`. Without enough data there is no plan.
3. **Follow-up plan.**
   - **Pre-approved steps** (library curated by physicians on Earth) start immediately.
   - Whatever Sentry proposes outside that library is a **draft pending validation** and travels to Earth.
   - At **F3** the approved protocol is shown instantly, with no free generation.
4. **Guided procedure in XR.** A Meta Quest guides the procedure (recommended case: ultrasound, not X-ray). The module detects the device with WebXR. Assets are local because of the offline-first requirement.
5. **Result as a new observation.** What is captured returns to the system with provenance ("self-taken, XR-guided") and assessed image quality.
6. **Preliminary findings.** MedGemma drafts preliminary findings, never a diagnosis. The CMO reviews them.
7. **Validation on Earth.** The physician approves, modifies or rejects. The AI proposal (with model version) is audited against the human decision.
8. **Follow-up.** See the next section. The engine reevaluates with the new data.

## Tracking progress

When the plan is created, a **follow-up contract** is defined with deterministic rules:

- **Target signals** and the expected direction relative to the individual baseline.
- **Review windows** (when to evaluate again).
- **Adherence:** steps completed, XR sessions done.
- **Periodic self-report:** symptoms and fatigue, structured by Jev.

Result of each review: `improving`, `stable`, `worsening` or `NOT_EVALUABLE`.

- `worsening` raises the status and notifies Earth.
- `improving` does not lower the status automatically. It lowers with hysteresis (several consecutive windows) and confirmation from the CMO or Earth.
- **The baseline is frozen during treatment** so it does not absorb the deviation or the treatment effect.
- The plan start is recorded on the timeline to tell treatment effect from spontaneous variation.
- If adherence or data quality changes, the result is `NOT_EVALUABLE`, not "improved".

## Where Jev comes in

Jev (TypeSafe AI, System One) is a decision model: it does not generate text, it returns typed answers with probability (`choice`, `score`, `noul`). It is fast and cheap, and is already in the repo as the risk classifier (with LAYA fallback and mock).

It is **probabilistic**, so it does not decide F0–F3. It is used in the layer that structures, not the one that decides:

| Use | Type | Example |
|---|---|---|
| Structure self-report or voice | `choice` / `score` | Free text → symptom category and severity, confirmed by the user |
| Route to the protocol | `choice` | Choose among **already approved** protocols from the library |
| Score subjective progress | `score` | Fatigue or pain at each follow-up review |
| Guardrail on MedGemma's output | `noul` | "Does the text contain a diagnosis or a prescription?" If so, it is blocked |

Cautions:
- Record the model version and confidence on every use. Low confidence is treated as "ask for confirmation", never as data.
- Jev has no self-hosting according to the documentation, which clashes with offline-first. That is why the **Jev → LAYA (local) → mock** chain is part of the design, not a detail.
- Low latency is a third-party claim; it is not verified.

## Pending items to refine

- The concrete case that will be the thread of the demo (anomaly and XR procedure).
- Demonstration rules and thresholds (declared as the project's own).
- Exact criteria for `improving` / `worsening` and for hysteresis.
- Content of the pre-approved protocol library.
- What travels to Earth and what the crew and the commander see.
