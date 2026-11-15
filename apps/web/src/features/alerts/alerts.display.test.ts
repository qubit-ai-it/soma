import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatDateTime, openLevels } from "./alerts.display.ts";
import type { Alert } from "./alerts.types.ts";

const alert = (memberId: string, level: Alert["level"], status: Alert["status"]): Alert => ({
  id: `${memberId}-${level}-${status}`,
  memberId,
  memberLabel: memberId,
  level,
  title: "t",
  action: "a",
  recipients: ["cmo"],
  status,
  createdAt: "2026-10-31T06:00:00.000Z",
  source: "deterministic-engine",
});

describe("openLevels", () => {
  it("keeps the highest unresolved level per member and skips closed alerts", () => {
    const result = openLevels([
      alert("a", "F2", "open"),
      alert("a", "F3", "acknowledged"),
      alert("b", "F3", "closed"),
      alert("c", "NOT_EVALUABLE", "open"),
    ]);
    assert.deepEqual(result, [
      { memberId: "a", level: "F3" },
      { memberId: "c", level: "NOT_EVALUABLE" },
    ]);
  });

  it("returns nothing without alerts", () => {
    assert.deepEqual(openLevels([]), []);
  });
});

describe("formatDateTime", () => {
  it("renders date and UTC time", () => {
    assert.equal(formatDateTime("2026-10-31T06:05:09.000Z"), "2026-10-31 06:05:09 UTC");
  });
});
