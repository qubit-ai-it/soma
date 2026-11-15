import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectCapabilities, resolveDeviceProfile } from "./device-profile.logic.ts";
import type { XrCapabilities } from "./device-profile.logic.ts";

const QUEST_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 OculusBrowser/35.0 Chrome/126 VR Mobile Safari/537.36";
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126";

const quest: XrCapabilities = {
  hasXr: true,
  vrSupported: true,
  arSupported: true,
  secureContext: true,
  userAgent: QUEST_UA,
};

describe("resolveDeviceProfile", () => {
  it("detects a Meta Quest with immersive support in a secure context", () => {
    const profile = resolveDeviceProfile(quest);
    assert.equal(profile.kind, "quest");
    assert.equal(profile.label, "Meta Quest detectado");
  });

  it("falls back to simulated mode on a desktop browser without WebXR", () => {
    const profile = resolveDeviceProfile({
      hasXr: false,
      vrSupported: false,
      arSupported: false,
      secureContext: true,
      userAgent: DESKTOP_UA,
    });
    assert.equal(profile.kind, "simulated");
    assert.equal(profile.label, "Visor no detectado");
    assert.match(profile.detail, /WebXR/);
  });

  it("explains that WebXR needs a secure context", () => {
    const profile = resolveDeviceProfile({ ...quest, hasXr: false, secureContext: false });
    assert.equal(profile.kind, "simulated");
    assert.match(profile.detail, /HTTPS|seguro/);
  });

  it("does not claim a Quest when WebXR reports no immersive session", () => {
    const profile = resolveDeviceProfile({ ...quest, vrSupported: false, arSupported: false });
    assert.equal(profile.kind, "simulated");
  });

  it("does not claim a Quest for a non-Quest WebXR device", () => {
    const profile = resolveDeviceProfile({ ...quest, userAgent: DESKTOP_UA });
    assert.equal(profile.kind, "simulated");
  });

  it("accepts immersive-ar alone as support", () => {
    const profile = resolveDeviceProfile({ ...quest, vrSupported: false });
    assert.equal(profile.kind, "quest");
  });
});

describe("detectCapabilities", () => {
  it("reports no WebXR when navigator.xr is missing", async () => {
    const caps = await detectCapabilities({
      navigator: { userAgent: DESKTOP_UA },
      isSecureContext: true,
    });
    assert.equal(caps.hasXr, false);
    assert.equal(caps.vrSupported, false);
    assert.equal(caps.arSupported, false);
  });

  it("queries both immersive modes", async () => {
    const asked: string[] = [];
    const caps = await detectCapabilities({
      navigator: {
        userAgent: QUEST_UA,
        xr: {
          isSessionSupported: async (mode: string) => {
            asked.push(mode);
            return mode === "immersive-vr";
          },
        },
      },
      isSecureContext: true,
    });
    assert.deepEqual(asked.sort(), ["immersive-ar", "immersive-vr"]);
    assert.equal(caps.vrSupported, true);
    assert.equal(caps.arSupported, false);
    assert.equal(caps.hasXr, true);
  });

  it("treats a throwing isSessionSupported as unsupported", async () => {
    const caps = await detectCapabilities({
      navigator: {
        userAgent: QUEST_UA,
        xr: {
          isSessionSupported: async () => {
            throw new Error("denied");
          },
        },
      },
      isSecureContext: true,
    });
    assert.equal(caps.hasXr, true);
    assert.equal(caps.vrSupported, false);
    assert.equal(caps.arSupported, false);
  });

  it("does not touch navigator.xr outside a secure context", async () => {
    let called = false;
    const caps = await detectCapabilities({
      navigator: {
        userAgent: QUEST_UA,
        xr: {
          isSessionSupported: async () => {
            called = true;
            return true;
          },
        },
      },
      isSecureContext: false,
    });
    assert.equal(called, false);
    assert.equal(caps.secureContext, false);
    assert.equal(caps.vrSupported, false);
  });
});
