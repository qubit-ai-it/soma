import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ProtocolSelection } from "../protocols/protocols.types.ts";
import { buildSplitPlan, pendingDraft } from "./plan.split.ts";
import type { CarePlanDTO } from "./plan.types.ts";

const approval = {
  approvedBy: "Demo panel",
  version: "demo-1.0.0",
  approvedAt: "2026-10-01T00:00:00Z",
  source: "Demonstration content",
  demonstration: true,
} as const;

const selections: ProtocolSelection[] = [
  {
    protocol: {
      id: "p1",
      title: "Protocol one",
      summary: "s",
      steps: [
        { id: "p1-1", text: "first" },
        { id: "p1-2", text: "second" },
      ],
      triggers: { ruleIds: [], signals: [] },
      approval,
    },
    matchedBy: ["rule:sleep-low"],
  },
  {
    protocol: {
      id: "p2",
      title: "Protocol two",
      summary: "s",
      steps: [{ id: "p2-1", text: "third" }],
      triggers: { ruleIds: [], signals: [] },
      approval,
    },
    matchedBy: ["status:F1"],
  },
];

const draftInput = {
  steps: ["a", "b", "c"],
  uncertainty: "u",
  provider: "simulated-medgemma",
  mode: "mock" as const,
};

describe("buildSplitPlan", () => {
  it("flattens approved protocol steps in library order with their origin", () => {
    const plan = buildSplitPlan(selections, null);
    assert.deepEqual(
      plan.immediateSteps.map((s) => [s.stepId, s.text, s.protocolId, s.protocolTitle]),
      [
        ["p1-1", "first", "p1", "Protocol one"],
        ["p1-2", "second", "p1", "Protocol one"],
        ["p2-1", "third", "p2", "Protocol two"],
      ],
    );
  });

  it("carries approval metadata and the reason each step was selected", () => {
    const [first] = buildSplitPlan(selections, null).immediateSteps;
    assert.deepEqual(first.approval, approval);
    assert.deepEqual(first.matchedBy, ["rule:sleep-low"]);
  });

  it("has no draft when none is given", () => {
    assert.equal(buildSplitPlan(selections, null).proposedDraft, null);
  });

  it("has no immediate steps without selections but keeps the draft", () => {
    const plan = buildSplitPlan([], pendingDraft(draftInput));
    assert.deepEqual(plan.immediateSteps, []);
    assert.equal(plan.proposedDraft?.steps.length, 3);
  });

  it("keeps the draft separate from the approved steps", () => {
    const plan = buildSplitPlan(selections, pendingDraft(draftInput));
    assert.equal(plan.immediateSteps.some((s) => draftInput.steps.includes(s.text)), false);
    assert.deepEqual(plan.proposedDraft?.steps, ["a", "b", "c"]);
  });
});

describe("pendingDraft", () => {
  it("always marks the draft pending validation and requiring human validation", () => {
    const draft = pendingDraft(draftInput);
    assert.deepEqual(draft.validation, { status: "pending-validation" });
    assert.equal(draft.requiresHumanValidation, true);
  });

  it("keeps provider and mode of the planner output", () => {
    const draft = pendingDraft(draftInput);
    assert.equal(draft.provider, "simulated-medgemma");
    assert.equal(draft.mode, "mock");
  });

  it("ignores any approval claim smuggled in the input", () => {
    const draft = pendingDraft({
      ...draftInput,
      validation: { status: "approved" },
    } as never);
    assert.deepEqual(draft.validation, { status: "pending-validation" });
  });
});

describe("draft typing", () => {
  it("does not allow the app to mark a draft as approved", () => {
    const draft: CarePlanDTO = pendingDraft(draftInput);
    // @ts-expect-error a draft can only be pending-validation
    draft.validation = { status: "approved" };
    // @ts-expect-error requiresHumanValidation is literally true
    draft.requiresHumanValidation = false;
    assert.ok(draft);
  });
});
