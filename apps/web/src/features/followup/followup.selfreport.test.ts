import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selfReportToScore } from "./followup.selfreport.ts";

describe("selfReportToScore", () => {
  it("maps the fatigue level to a base score on the 0-10 scale", () => {
    const score = (fatigue: "none" | "mild" | "moderate" | "severe") => {
      const result = selfReportToScore({ fatigue, symptoms: [], confirmedByUser: true });
      assert.equal(result.ok, true);
      return result.ok ? result.value : NaN;
    };
    assert.deepEqual([score("none"), score("mild"), score("moderate"), score("severe")], [0, 3, 6, 9]);
  });

  it("adds the severity of reported symptoms", () => {
    const result = selfReportToScore({
      fatigue: "moderate",
      symptoms: [
        { category: "headache", severity: "mild" },
        { category: "dizziness", severity: "severe" },
      ],
      confirmedByUser: true,
    });
    assert.deepEqual(result, { ok: true, value: 8 });
  });

  it("caps the score at 10", () => {
    const result = selfReportToScore({
      fatigue: "severe",
      symptoms: [
        { category: "a", severity: "severe" },
        { category: "b", severity: "severe" },
        { category: "c", severity: "severe" },
      ],
      confirmedByUser: true,
    });
    assert.deepEqual(result, { ok: true, value: 10 });
  });

  it("refuses an unconfirmed report: a suggestion is never data", () => {
    const result = selfReportToScore({ fatigue: "mild", symptoms: [], confirmedByUser: false });
    assert.deepEqual(result, { ok: false, error: "not-confirmed" });
  });

  it("is deterministic", () => {
    const input = {
      fatigue: "mild" as const,
      symptoms: [{ category: "x", severity: "moderate" as const }],
      confirmedByUser: true,
    };
    assert.deepEqual(selfReportToScore(input), selfReportToScore(input));
  });
});
