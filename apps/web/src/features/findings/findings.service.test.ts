import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { captureToObservation } from "../capture/capture.logic.ts";
import type { Observation } from "../observation/observation.types.ts";
import { err, ok } from "../../shared/result.ts";
import { FINDINGS_LABEL, requestFindings } from "./findings.service.ts";
import type { FindingsProvider } from "./findings.port.ts";
import { findingsOutputSchema } from "./findings.schema.ts";
import { createSimulatedFindingsProvider } from "./findings.simulated.ts";

const NOW = "2026-11-15T10:00:00.000Z";

function observation(state: "valid" | "suspect" | "invalid"): Observation {
  return captureToObservation({
    id: "obs-1",
    subjectId: "cm-01",
    imageRef: "ultrasound-1.jpg",
    observedAt: NOW,
    assessment: state === "valid" ? { state } : { state, reason: "Imagen oscura" },
    synthetic: true,
  });
}

function spyProvider(output: unknown): { provider: FindingsProvider; calls: number } {
  const spy = { calls: 0, provider: undefined as unknown as FindingsProvider };
  spy.provider = {
    name: "spy",
    async generate() {
      spy.calls += 1;
      return ok(output as never);
    },
  };
  return spy;
}

describe("simulated findings provider", () => {
  const provider = createSimulatedFindingsProvider();

  it("is named simulated-medgemma", () => {
    assert.equal(provider.name, "simulated-medgemma");
  });

  it("is deterministic for the same observation", async () => {
    const a = await provider.generate({ observation: observation("valid") });
    const b = await provider.generate({ observation: observation("valid") });
    assert.deepEqual(a, b);
  });

  it("returns schema-valid findings with an uncertainty statement", async () => {
    const result = await provider.generate({ observation: observation("valid") });
    assert.ok(result.ok);
    assert.ok(findingsOutputSchema.safeParse(result.value).success);
    assert.ok(result.value.uncertainty.length > 0);
  });
});

describe("requestFindings", () => {
  it("returns labeled preliminary findings for a valid image", async () => {
    const provider = createSimulatedFindingsProvider();
    const result = await requestFindings(provider, observation("valid"), { now: () => NOW });
    assert.ok(result.ok);
    assert.equal(result.value.label, FINDINGS_LABEL);
    assert.equal(
      FINDINGS_LABEL,
      "Hallazgos preliminares · no es un diagnóstico · requiere revisión del médico",
    );
    assert.equal(result.value.requiresHumanReview, true);
    assert.equal(result.value.source.provider, "simulated-medgemma");
    assert.equal(result.value.source.mode, "mock");
    assert.equal(result.value.observationId, "obs-1");
  });

  for (const state of ["invalid", "suspect"] as const) {
    it(`never calls the provider for a ${state} image`, async () => {
      const spy = spyProvider({ findings: "ok", uncertainty: "ok" });
      const result = await requestFindings(spy.provider, observation(state), { now: () => NOW });
      assert.equal(spy.calls, 0);
      assert.ok(!result.ok);
      assert.equal(result.error.code, "image-not-evaluable");
    });
  }

  it("blocks a diagnostic text from the provider", async () => {
    const spy = spyProvider({
      findings: "El paciente tiene una colecistitis aguda.",
      uncertainty: "Baja confianza.",
    });
    const result = await requestFindings(spy.provider, observation("valid"), { now: () => NOW });
    assert.equal(spy.calls, 1);
    assert.ok(!result.ok);
    assert.equal(result.error.code, "guardrail-blocked");
    assert.match(result.error.reason, /diagn/i);
  });

  it("blocks a prescriptive text from the provider", async () => {
    const spy = spyProvider({
      findings: "Estructura visible. Tomar 400 mg de ibuprofeno.",
      uncertainty: "Baja confianza.",
    });
    const result = await requestFindings(spy.provider, observation("valid"), { now: () => NOW });
    assert.ok(!result.ok);
    assert.equal(result.error.code, "guardrail-blocked");
  });

  it("blocks a diagnosis hidden in the uncertainty statement", async () => {
    const spy = spyProvider({
      findings: "Estructura visible.",
      uncertainty: "The patient has a fracture.",
    });
    const result = await requestFindings(spy.provider, observation("valid"), { now: () => NOW });
    assert.ok(!result.ok);
    assert.equal(result.error.code, "guardrail-blocked");
  });

  it("rejects malformed provider output", async () => {
    const spy = spyProvider({ findings: "" });
    const result = await requestFindings(spy.provider, observation("valid"), { now: () => NOW });
    assert.ok(!result.ok);
    assert.equal(result.error.code, "invalid-output");
  });

  it("reports a provider failure", async () => {
    const provider: FindingsProvider = {
      name: "down",
      async generate() {
        return err("offline");
      },
    };
    const result = await requestFindings(provider, observation("valid"), { now: () => NOW });
    assert.ok(!result.ok);
    assert.equal(result.error.code, "provider-failed");
  });

  it("reports a provider that throws", async () => {
    const provider: FindingsProvider = {
      name: "boom",
      async generate() {
        throw new Error("boom");
      },
    };
    const result = await requestFindings(provider, observation("valid"), { now: () => NOW });
    assert.ok(!result.ok);
    assert.equal(result.error.code, "provider-failed");
  });
});
