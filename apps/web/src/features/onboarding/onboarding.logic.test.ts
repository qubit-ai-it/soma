import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SENTRY_MODES } from "../../shared/sentry.types.ts";
import {
  ONBOARDING_DONE,
  ONBOARDING_STEPS,
  SETUP_KINDS,
  isLastStep,
  nextStepIndex,
  shouldShowOnboarding,
} from "./onboarding.logic.ts";

const words = (text: string) => text.trim().split(/\s+/).length;

describe("onboarding steps", () => {
  it("has unique ids and a valid Sentry mode on every step", () => {
    assert.equal(new Set(ONBOARDING_STEPS.map((s) => s.id)).size, ONBOARDING_STEPS.length);
    for (const step of ONBOARDING_STEPS) {
      assert.ok((SENTRY_MODES as readonly string[]).includes(step.mode), step.id);
    }
  });

  it("keeps every step short: a headline and one line", () => {
    for (const step of ONBOARDING_STEPS) {
      assert.ok(words(step.title) <= 6, `title too long: ${step.title}`);
      assert.ok(words(step.line) <= 14, `line too long: ${step.line}`);
    }
  });

  it("asks for the role, the data source and the XR headset once each, after the intro", () => {
    const kinds = ONBOARDING_STEPS.map((s) => s.kind);
    assert.deepEqual(
      kinds.filter((k) => k !== "info"),
      [...SETUP_KINDS],
    );
    const firstSetup = kinds.findIndex((k) => k !== "info");
    assert.ok(kinds.slice(0, firstSetup).every((k) => k === "info"));
    assert.ok(kinds.slice(firstSetup).every((k) => k !== "info"));
  });

  it("walks forward without passing the last step", () => {
    const last = ONBOARDING_STEPS.length - 1;
    assert.equal(nextStepIndex(0), 1);
    assert.equal(nextStepIndex(last), last);
    assert.equal(isLastStep(last), true);
    assert.equal(isLastStep(0), false);
  });
});

describe("shouldShowOnboarding", () => {
  it("shows on a first visit and for unreadable values", () => {
    assert.equal(shouldShowOnboarding(null), true);
    assert.equal(shouldShowOnboarding(""), true);
    assert.equal(shouldShowOnboarding("garbage"), true);
  });

  it("does not show again once it was completed", () => {
    assert.equal(shouldShowOnboarding(ONBOARDING_DONE), false);
  });
});
