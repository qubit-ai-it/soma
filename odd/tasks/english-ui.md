# English demo UI: implementation tracker

## Objective and rationale

Translate the current demo interface and user-visible content into English so the experience is consistent for its primary audience, without changing the behavior or meaning of the existing system. Work on `codex/english-ui` in independently verifiable units and use conventional commits in English. Do not push or deploy.

## Scope and constraints

- Cover navigation, onboarding, mission simulation, reports, clinical workflows, assistant, ground communication, XR and devices. Discover the exact affected files before each unit.
- Translate visible labels, messages, guidance, accessibility text and relevant demo content while preserving clinical meaning and the distinction between implemented and simulated capabilities.
- Preserve routes, identifiers, IDs, persisted values, API contracts and internal aliases. Do not translate internal keys merely because they resemble Spanish UI copy.
- Do not mutate existing persisted data without explicit authorization. Identify any stored content that cannot safely be translated at display time and report the limitation.
- English audio is an expectation, not a verified capability: investigate existing speech generation, available voices and browser/device behavior. Do not claim working English audio without observing it; report unavailable or unverified paths.
- Preserve existing scientific sources, safety warnings, units and clinical meaning. Do not introduce unsupported clinical claims or alter decision rules during translation.
- Retain existing architecture and dependencies. Avoid unrelated changes, destructive operations and external services without authorization.

## Tasks

- [ ] **E01 — Global navigation and onboarding.** Translate shared navigation, shell, onboarding and global feedback. Verify representative routes and accessible names. Route: delegated; shared UI and onboarding require coordinated changes across files. Estimated 150–300 authored changed lines.
- [ ] **E02 — Simulation and mission.** Translate mission overview, simulation controls and user-visible scenario content while preserving simulation state, identifiers and persisted data. Verify mission interactions and representative scenarios. Route: delegated; multiple views and content sources. Estimated 150–300 authored changed lines.
- [ ] **E03 — Reports and clinical workflows.** Translate report views, assessments and clinical guidance without changing thresholds, units, data interpretation or warnings. Verify representative reports and flows against their original meaning. Route: delegated; clinical content and multiple routes require focused verification. Estimated 200–400 authored changed lines.
- [ ] **E04 — Remaining features and final audit.** Translate remaining assistant, ground, XR and device interfaces; assess English audio where available; audit all flows for untranslated user-visible copy and accessibility text. Verify representative interactions and record gaps. Route: delegated; cross-feature scope and end-to-end checks. Estimated 200–400 authored changed lines.

## Acceptance and verification

- Every in-scope user-facing flow is understandable in English, including errors, empty states and accessibility names; unavoidable untranslated persisted content is explicitly reported.
- Existing route and identifier behavior, clinical rules, units and data remain unchanged. Confirm no migration or mutation of previously persisted content occurred.
- Apply test-first development when a meaningful deterministic test and clear expected outcome exist; record observed RED → GREEN, or document a proportionate exception. Keep translation tests with their behavior.
- Run focused tests for each unit and applicable full tests, lint and type checks. Verify representative navigation and flows in a running app when possible; record commands, results and unavailable checks without inventing evidence. Check English audio separately and report the actual environment and outcome.
- Complete each task only after observing its outcomes and applicable checks. Record the commit identity, rollback boundary and review-assessment outcome for each unit. Mirror this tracker under Engram topic `odd/english-ui/tasks`.

## Delivery

- Strategy: **ask-on-risk**. The combined forecast exceeds approximately 400 authored changed lines, excluding generated files; before the next implementation commit, ask the user to select the required chain strategy. The 400-line figure is advisory: do not omit tests, compress code or split a coherent change merely to satisfy it.
- Each conventional commit should represent a coherent, reversible behavior with its relevant tests and documentation. Track accumulated authored changes and any resulting slice boundaries here. Push, pull request and deployment require separate authorization.
- E01 is implemented but remains open and uncommitted. Its focused tests passed 82/82; independent review passed 39/39; the `Rules decide` correction passed 10/10. The full suite and TypeScript checks are incomplete because dependencies were not installed after updating `main`; lint and build remain pending. The document currently declares `html lang="en"` while other sections remain in Spanish; this is a transitional state, not proof of a fully English interface.

## Next step

Complete E01 verification once dependencies are available, including the full suite, TypeScript, lint and build. Continue translating the remaining sections and resolve the transitional language mismatch before the final audit.
