import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pickProvider, providerLabel } from "./simulation.provider.ts";

describe("pickProvider", () => {
  it("prefers MedGemma when its endpoint is configured", () => {
    assert.equal(pickProvider({ chatUrl: "https://med.example", geminiApiKey: "k" }), "medgemma");
    assert.equal(pickProvider({ chatUrl: "https://med.example", geminiApiKey: undefined }), "medgemma");
  });

  it("falls back to Gemini when only its key exists", () => {
    assert.equal(pickProvider({ chatUrl: undefined, geminiApiKey: "k" }), "gemini");
  });

  it("returns null when neither is configured", () => {
    assert.equal(pickProvider({ chatUrl: undefined, geminiApiKey: undefined }), null);
  });

  it("labels the provider, defaulting to MedGemma", () => {
    assert.equal(providerLabel("gemini"), "Gemini");
    assert.equal(providerLabel(undefined), "MedGemma");
  });
});
