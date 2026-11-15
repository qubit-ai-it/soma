import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeBaseline } from "../baseline/baseline.logic.ts";
import type { Observation } from "../observation/observation.types.ts";
import { evaluateFollowUp } from "./followup.logic.ts";
import { loadFollowUpScenario } from "./followup.testing.ts";

const recovery = loadFollowUpScenario("followup-recovery");
const worsening = loadFollowUpScenario("followup-worsening");

const END = {
  w1: "2026-11-21T00:00:00Z",
  w2: "2026-11-24T00:00:00Z",
  w3: "2026-11-27T00:00:00Z",
  w4: "2026-11-30T00:00:00Z",
};

const statuses = (s: typeof recovery, evaluatedAt: string, observations = s.observations) =>
  evaluateFollowUp({ contract: s.contract, observations, evaluatedAt }).windows.map((w) => w.status);

const inWindow = (o: Observation, from: string, to: string) =>
  Date.parse(o.observedAt) >= Date.parse(from) && Date.parse(o.observedAt) < Date.parse(to);

describe("recovery scenario", () => {
  it("walks stable, then improving windows", () => {
    assert.deepEqual(statuses(recovery, END.w4), ["stable", "improving", "improving", "improving"]);
  });

  it("only reports windows that already closed", () => {
    assert.deepEqual(statuses(recovery, END.w2), ["stable", "improving"]);
    assert.deepEqual(statuses(recovery, "2026-11-19T00:00:00Z"), []);
  });

  it("needs several consecutive improving windows before proposing a step down", () => {
    const at = (end: string) => evaluateFollowUp({ ...recovery, evaluatedAt: end });
    assert.equal(at(END.w2).consecutiveImproving, 1);
    assert.equal(at(END.w2).stepDown.proposed, false);
    assert.equal(at(END.w3).consecutiveImproving, 2);
    assert.equal(at(END.w3).stepDown.proposed, false);
    assert.equal(at(END.w4).consecutiveImproving, 3);
    assert.equal(at(END.w4).stepDown.proposed, true);
  });

  it("never applies the step down by itself: it always needs human confirmation", () => {
    const result = evaluateFollowUp({ ...recovery, evaluatedAt: END.w4 });
    assert.equal(result.stepDown.automatic, false);
    assert.equal(result.stepDown.requiresHumanConfirmation, true);
    assert.equal(result.escalate.notifyEarth, false);
  });

  it("reports adherence per window", () => {
    const result = evaluateFollowUp({ ...recovery, evaluatedAt: END.w4 });
    assert.deepEqual(result.windows[0].adherence, {
      stepsDone: 11,
      stepsPlanned: 12,
      xrSessionsDone: 1,
      xrSessionsPlanned: 1,
      stepsRatio: 11 / 12,
    });
  });

  it("evaluates every target signal in each window", () => {
    const [first] = evaluateFollowUp({ ...recovery, evaluatedAt: END.w1 }).windows;
    assert.deepEqual(first.signals.map((s) => s.signal), ["sleepHours", "hrv", "fatigue"]);
    assert.ok(first.signals.every((s) => s.observationCount === 3));
  });
});

describe("worsening scenario", () => {
  it("walks stable, then worsening windows", () => {
    assert.deepEqual(statuses(worsening, END.w4), ["stable", "worsening", "worsening", "worsening"]);
  });

  it("notifies Earth when the latest window is worsening and never proposes a step down", () => {
    const result = evaluateFollowUp({ ...worsening, evaluatedAt: END.w4 });
    assert.deepEqual(result.escalate, { notifyEarth: true, reason: "latest-window-worsening" });
    assert.equal(result.stepDown.proposed, false);
    assert.equal(result.consecutiveImproving, 0);
  });

  it("does not notify while the latest window is only stable", () => {
    const result = evaluateFollowUp({ ...worsening, evaluatedAt: END.w1 });
    assert.deepEqual(result.escalate, { notifyEarth: false, reason: null });
  });
});

describe("frozen baseline", () => {
  it("uses the baseline frozen before the deviation, not one that absorbs it", () => {
    const result = evaluateFollowUp({ ...recovery, evaluatedAt: END.w4 });
    const frozen = computeBaseline(recovery.observations, {
      subjectId: "cm-01",
      signal: "hrv",
      minObservations: 5,
      frozenAt: recovery.contract.baselineFrozenAt,
    });
    const drifting = computeBaseline(recovery.observations, {
      subjectId: "cm-01",
      signal: "hrv",
      minObservations: 5,
    });
    assert.equal(frozen.status, "ready");
    assert.equal(drifting.status, "ready");
    const hrv = result.baselines.find((b) => b.signal === "hrv");
    assert.equal(hrv?.center, frozen.status === "ready" ? frozen.center : NaN);
    assert.equal(hrv?.frozenAt, recovery.contract.baselineFrozenAt);
    assert.notEqual(
      frozen.status === "ready" ? frozen.center : 0,
      drifting.status === "ready" ? drifting.center : 0,
    );
  });

  it("does not change when later observations are added", () => {
    const extra = recovery.observations.map((o) =>
      o.signal === "hrv" && Date.parse(o.observedAt) >= Date.parse("2026-11-18T00:00:00Z")
        ? { ...o, value: 30 }
        : o,
    );
    const a = evaluateFollowUp({ ...recovery, evaluatedAt: END.w4 }).baselines;
    const b = evaluateFollowUp({
      contract: recovery.contract,
      observations: extra,
      evaluatedAt: END.w4,
    }).baselines;
    assert.deepEqual(a, b);
  });
});

describe("not evaluable", () => {
  const withoutAdherence = (from: string, to: string) =>
    recovery.observations.filter(
      (o) => !(["stepsDone", "xrSessions"].includes(o.signal) && inWindow(o, from, to)),
    );

  it("is not evaluable when adherence is missing, never improved", () => {
    const obs = withoutAdherence("2026-11-21T00:00:00Z", END.w2);
    const result = evaluateFollowUp({
      contract: recovery.contract,
      observations: obs,
      evaluatedAt: END.w2,
    });
    assert.equal(result.windows[1].status, "not-evaluable");
    assert.deepEqual(result.windows[1].reasons, ["adherence-missing"]);
    assert.equal(result.windows[1].adherence, null);
  });

  it("is not evaluable when steps adherence falls below the minimum", () => {
    const obs = recovery.observations.map((o) =>
      o.signal === "stepsDone" && inWindow(o, "2026-11-21T00:00:00Z", END.w2)
        ? { ...o, value: 1 }
        : o,
    );
    const result = evaluateFollowUp({
      contract: recovery.contract,
      observations: obs,
      evaluatedAt: END.w2,
    });
    assert.equal(result.windows[1].status, "not-evaluable");
    assert.deepEqual(result.windows[1].reasons, ["adherence-low"]);
  });

  it("is not evaluable when XR sessions were not done", () => {
    const obs = recovery.observations.map((o) =>
      o.signal === "xrSessions" && inWindow(o, "2026-11-21T00:00:00Z", END.w2)
        ? { ...o, value: 0 }
        : o,
    );
    const result = evaluateFollowUp({
      contract: recovery.contract,
      observations: obs,
      evaluatedAt: END.w2,
    });
    assert.equal(result.windows[1].status, "not-evaluable");
    assert.deepEqual(result.windows[1].reasons, ["adherence-low"]);
  });

  it("flags an adherence change even above the minimum ratio", () => {
    const contract = {
      ...recovery.contract,
      adherence: { ...recovery.contract.adherence, minRatio: 0.5, maxDrop: 0.1 },
    };
    const obs = recovery.observations.map((o) =>
      o.signal === "stepsDone" && inWindow(o, "2026-11-21T00:00:00Z", END.w2)
        ? { ...o, value: 3 }
        : o,
    );
    const result = evaluateFollowUp({ contract, observations: obs, evaluatedAt: END.w2 });
    assert.equal(result.windows[1].status, "not-evaluable");
    assert.deepEqual(result.windows[1].reasons, ["adherence-changed"]);
  });

  it("is not evaluable when a target signal lacks enough valid observations", () => {
    const obs = recovery.observations.map((o) =>
      o.signal === "fatigue" && inWindow(o, "2026-11-21T00:00:00Z", END.w2)
        ? { ...o, value: null, quality: { state: "missing" as const, reason: "no report" } }
        : o,
    );
    const result = evaluateFollowUp({
      contract: recovery.contract,
      observations: obs,
      evaluatedAt: END.w2,
    });
    assert.equal(result.windows[1].status, "not-evaluable");
    assert.deepEqual(result.windows[1].reasons, ["data-quality"]);
    const fatigue = result.windows[1].signals.find((s) => s.signal === "fatigue");
    assert.equal(fatigue?.reason, "data-quality");
  });

  it("resets the hysteresis count when a window is not evaluable", () => {
    const obs = withoutAdherence("2026-11-24T00:00:00Z", END.w3);
    const result = evaluateFollowUp({
      contract: recovery.contract,
      observations: obs,
      evaluatedAt: END.w4,
    });
    assert.deepEqual(
      result.windows.map((w) => w.status),
      ["stable", "improving", "not-evaluable", "improving"],
    );
    assert.equal(result.consecutiveImproving, 1);
    assert.equal(result.stepDown.proposed, false);
  });

  it("is not evaluable everywhere when the frozen baseline is insufficient", () => {
    const contract = { ...recovery.contract, minBaselineObservations: 50 };
    const result = evaluateFollowUp({
      contract,
      observations: recovery.observations,
      evaluatedAt: END.w2,
    });
    assert.ok(result.windows.every((w) => w.status === "not-evaluable"));
    assert.ok(result.windows.every((w) => w.reasons.includes("baseline-insufficient")));
    assert.equal(result.stepDown.proposed, false);
  });

  it("is not evaluable when there is no deviation to recover from", () => {
    const flat = recovery.observations.map((o) =>
      o.signal === "hrv" && inWindow(o, "2026-11-15T00:00:00Z", "2026-11-18T00:00:00Z")
        ? { ...o, value: 52 }
        : o,
    );
    const result = evaluateFollowUp({
      contract: recovery.contract,
      observations: flat,
      evaluatedAt: END.w1,
    });
    assert.equal(result.windows[0].status, "not-evaluable");
    assert.ok(result.windows[0].reasons.includes("no-reference-deviation"));
  });
});
