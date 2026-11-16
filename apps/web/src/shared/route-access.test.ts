import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isAuthPath, isPublicAsset, isPublicPage } from "./route-access.ts";

describe("route access", () => {
  it("keeps only the onboarding home and the Clerk pages public", () => {
    for (const path of ["/", "/sign-in", "/sign-up", "/sign-in/factor-one", "/sign-up/verify-email-address"]) {
      assert.equal(isPublicPage(path), true, path);
    }
  });

  it("protects every other page", () => {
    for (const path of ["/mission", "/devices", "/earth", "/pet", "/report/cm-a1", "/experience/cpr", "/sign-inx", "/sign-up-fake"]) {
      assert.equal(isPublicPage(path), false, path);
    }
  });

  it("recognizes the auth pages, which are never covered by the onboarding", () => {
    assert.equal(isAuthPath("/sign-up"), true);
    assert.equal(isAuthPath("/sign-in/factor-one"), true);
    assert.equal(isAuthPath("/"), false);
    assert.equal(isAuthPath("/sign-uptown"), false);
  });

  it("serves the Rive runtime, the mascot files and the 3D models without a session", () => {
    for (const path of ["/rive/rive.wasm", "/rive/rive_fallback.wasm", "/mascot/soma.riv", "/mascot/sentry.png", "/models/body.glb"]) {
      assert.equal(isPublicAsset(path), true, path);
    }
  });

  it("does not open any page by treating it as an asset", () => {
    for (const path of ["/mission", "/rive", "/mascots", "/report/rive/x"]) {
      assert.equal(isPublicAsset(path), false, path);
    }
  });
});
