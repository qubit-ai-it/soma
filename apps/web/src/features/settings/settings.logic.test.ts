import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_SETTINGS, SOURCE_OPTIONS, XR_OPTIONS, parseSettings } from "./settings.logic.ts";

const words = (text: string) => text.trim().split(/\s+/).length;

describe("parseSettings", () => {
  it("falls back to the defaults for missing or unreadable values", () => {
    for (const raw of [undefined, null, "x", 3, [], {}]) {
      assert.deepEqual(parseSettings(raw), DEFAULT_SETTINGS);
    }
  });

  it("keeps valid values, including the paired device name", () => {
    const raw = { source: "bluetooth", xr: "quest", color: "#7C3AED", device: "Banda de pecho" };
    assert.deepEqual(parseSettings(raw), raw);
  });

  it("only accepts a color from the Sentry palette", () => {
    assert.equal(parseSettings({ color: "#123456" }).color, DEFAULT_SETTINGS.color);
    assert.equal(parseSettings({ color: 5 }).color, DEFAULT_SETTINGS.color);
    assert.equal(parseSettings({ color: "#E5322D" }).color, "#E5322D");
  });

  it("replaces each invalid field with its own default", () => {
    assert.deepEqual(parseSettings({ source: "usb", xr: "quest" }), {
      ...DEFAULT_SETTINGS,
      xr: "quest",
    });
    assert.deepEqual(parseSettings({ source: "bluetooth", xr: "headset" }), {
      ...DEFAULT_SETTINGS,
      source: "bluetooth",
    });
  });

  it("drops an empty or non-string device name", () => {
    assert.equal(parseSettings({ device: "" }).device, undefined);
    assert.equal(parseSettings({ device: 7 }).device, undefined);
  });
});

describe("setup options", () => {
  it("keeps labels and lines short", () => {
    for (const option of [...SOURCE_OPTIONS, ...XR_OPTIONS]) {
      assert.ok(words(option.label) <= 3, option.label);
      assert.ok(words(option.line) <= 10, option.line);
    }
  });

  it("offers the default as one of the options", () => {
    assert.ok(SOURCE_OPTIONS.some((o) => o.id === DEFAULT_SETTINGS.source));
    assert.ok(XR_OPTIONS.some((o) => o.id === DEFAULT_SETTINGS.xr));
  });
});
