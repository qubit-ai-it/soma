import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyEarthResponse, approveOnBoard, submitForReview } from "./plan.lifecycle.ts";
import type { PlanRecord, PlanReview } from "./plan.record.ts";

const NOW = "2026-11-16T12:00:00.000Z";
const plan = (over: Partial<PlanRecord> = {}): PlanRecord => ({
  id: "pl-1",
  subjectId: "cm-02",
  evaluationId: "ev-1",
  level: "F2",
  status: "draft",
  revision: 1,
  steps: ["Descansar", "Medir de nuevo"],
  uncertainty: "Borrador sin validar",
  source: { provider: "ollama", mode: "live" },
  concerns: [],
  reviews: [],
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});
const review = (over: Partial<PlanReview> = {}): PlanReview => ({
  responseId: "r1",
  decision: "approve",
  note: "",
  reviewerId: "demo-earth-md-01",
  at: NOW,
  ...over,
});

describe("plan lifecycle", () => {
  it("submits a draft once and bumps the revision after changes were requested", () => {
    const sent = submitForReview(plan(), NOW);
    assert.ok(sent.ok && sent.value.status === "in_review" && sent.value.revision === 1);
    assert.equal(submitForReview(sent.ok ? sent.value : plan(), NOW).ok, false);
    const again = submitForReview(plan({ status: "changes_requested" }), NOW);
    assert.ok(again.ok && again.value.revision === 2 && again.value.status === "in_review");
    assert.equal(submitForReview(plan({ status: "approved" }), NOW).ok, false);
  });

  it("lets the board approve only without a link", () => {
    const actor = { role: "cmo" as const, actorId: "demo-cmo-01" };
    assert.equal(approveOnBoard(plan(), actor, "connected", NOW).ok, false);
    const done = approveOnBoard(plan({ status: "in_review" }), actor, "disconnected", NOW);
    assert.ok(done.ok && done.value.status === "approved" && done.value.decided?.via === "board");
    assert.equal(approveOnBoard(plan({ status: "approved" }), actor, "disconnected", NOW).ok, false);
  });

  it("applies an Earth approval to a plan in review", () => {
    const { plan: next, applied } = applyEarthResponse(plan({ status: "in_review" }), review(), NOW);
    assert.equal(applied, true);
    assert.equal(next.status, "approved");
    assert.deepEqual(next.decided && [next.decided.via, next.decided.actorId], ["earth", "demo-earth-md-01"]);
  });

  it("is idempotent by response id", () => {
    const first = applyEarthResponse(plan({ status: "in_review" }), review(), NOW);
    const second = applyEarthResponse(first.plan, review(), NOW);
    assert.equal(second.applied, false);
    assert.deepEqual(second.plan, first.plan);
  });

  it("requests changes and replaces the steps only when Earth proposes new ones", () => {
    const withSteps = applyEarthResponse(
      plan({ status: "in_review" }),
      review({ decision: "changes", note: "Falta hidratación", steps: ["Hidratar", "Descansar"] }),
      NOW,
    );
    assert.equal(withSteps.plan.status, "changes_requested");
    assert.deepEqual(withSteps.plan.steps, ["Hidratar", "Descansar"]);
    const noSteps = applyEarthResponse(plan({ status: "in_review" }), review({ decision: "changes", note: "x" }), NOW);
    assert.deepEqual(noSteps.plan.steps, ["Descansar", "Medir de nuevo"]);
  });

  it("keeps the plan in review on a comment", () => {
    const { plan: next } = applyEarthResponse(plan({ status: "in_review" }), review({ decision: "comment", note: "Ojo" }), NOW);
    assert.equal(next.status, "in_review");
    assert.equal(next.reviews.length, 1);
  });

  it("records a late Earth response without reopening a decided plan", () => {
    const decided = plan({ status: "approved", decided: { via: "board", role: "cmo", actorId: "demo-cmo-01", at: NOW } });
    const { plan: next, applied } = applyEarthResponse(decided, review({ decision: "changes", note: "tarde" }), NOW);
    assert.equal(applied, true);
    assert.equal(next.status, "approved");
    assert.equal(next.reviews.length, 1);
  });
});
