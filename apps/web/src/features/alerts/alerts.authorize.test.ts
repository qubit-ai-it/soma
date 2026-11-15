import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { authorizeCaller } from "./alerts.authorize.ts";

describe("authorizeCaller", () => {
  it("accepts the named demo actor of a permitted role", () => {
    const result = authorizeCaller({ role: "cmo", actorId: "demo-cmo-01" }, "alert_acknowledge");
    assert.deepEqual(result, { ok: true, value: "demo-cmo-01" });
  });

  it("refuses a role without permission", () => {
    assert.equal(authorizeCaller({ role: "astronaut", actorId: "demo-astronaut-01" }, "alert_close").ok, false);
    assert.equal(authorizeCaller({ role: "commander", actorId: "demo-commander-01" }, "plan_review").ok, false);
  });

  it("refuses anonymous, system-like and mismatched actors", () => {
    for (const actorId of ["", "system", "demo-earth-md-01"]) {
      assert.equal(authorizeCaller({ role: "cmo", actorId }, "alert_acknowledge").ok, false, actorId);
    }
  });
});
