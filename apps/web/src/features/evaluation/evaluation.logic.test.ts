import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { ruleSetSchema } from "../rules/rules.schema.ts";
import { scenarioSchema } from "../scenario/scenario.schema.ts";
import { translateLimitation } from "./evaluation.labels.ts";
import {
  buildEvaluationBoard,
  buildScenarioView,
  matchesSubject,
} from "./evaluation.logic.ts";

function readSeed(path: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../../data/seed/${path}`, import.meta.url), "utf8"));
}

const ruleSet = ruleSetSchema.parse(readSeed("demo-ruleset.json"));
const load = (file: string) => scenarioSchema.parse(readSeed(`scenarios/${file}`));
const options = { minBaselineObservations: 5 };

const fatigue = buildScenarioView(load("fatigue-sleep-hrv.json"), ruleSet, options);
const critical = buildScenarioView(load("critical-f3.json"), ruleSet, options);
const insufficient = buildScenarioView(load("insufficient-data.json"), ruleSet, options);

const signalOf = (view: typeof fatigue, checkpoint: number, signal: string) => {
  const found = view.checkpoints[checkpoint].signals.find((s) => s.signal === signal);
  assert.ok(found, `signal ${signal} missing`);
  return found;
};

describe("buildScenarioView", () => {
  it("produces one checkpoint view per checkpoint with the engine status", () => {
    assert.deepEqual(
      fatigue.checkpoints.map((c) => c.status),
      ["F0", "F0", "F1", "F1", "F2", "F2"],
    );
    assert.deepEqual(
      critical.checkpoints.map((c) => c.status),
      ["F0", "F0", "F1", "F1", "F3"],
    );
    assert.deepEqual(
      insufficient.checkpoints.map((c) => c.status),
      Array(5).fill("NOT_EVALUABLE"),
    );
  });

  it("carries identity, versions and synthetic provenance", () => {
    assert.equal(fatigue.id, "fatigue-sleep-hrv");
    assert.equal(fatigue.subjectId, "cm-01");
    assert.equal(fatigue.ruleSetVersion, ruleSet.version);
    assert.deepEqual(fatigue.provenanceTypes, ["synthetic"]);
  });

  it("uses Spanish copy for known scenarios and checkpoints, raw text otherwise", () => {
    assert.equal(fatigue.title, "Sueño reducido, HRV en descenso y fatiga");
    assert.equal(fatigue.checkpoints[0].label, "Baseline estable");
    const unknown = buildScenarioView(
      { ...load("critical-f3.json"), id: "other", title: "Raw title" },
      ruleSet,
      options,
    );
    assert.equal(unknown.title, "Raw title");
  });

  it("describes triggered rules in Spanish with their parameters", () => {
    const last = fatigue.checkpoints[4];
    const rule = last.rules.find((r) => r.id === "hrv-low-persistent");
    assert.ok(rule);
    assert.equal(rule.label, "HRV baja de forma persistente");
    assert.equal(rule.level, "F2");
    assert.equal(rule.kind, "signal");
    assert.deepEqual(rule.signals, ["hrv"]);
    assert.equal(
      rule.description,
      "Variabilidad cardíaca (HRV) baja 2 o más desviaciones respecto a su baseline durante 3 lecturas consecutivas",
    );
    const convergence = last.rules.find((r) => r.id === "conv-3");
    assert.ok(convergence);
    assert.equal(convergence.kind, "convergence");
    assert.equal(convergence.description, "Al menos 3 señales con una regla activa a la vez");
    assert.ok(convergence.signals.length >= 3);
  });

  it("lists no rules for F0 and for not evaluable checkpoints", () => {
    assert.deepEqual(fatigue.checkpoints[0].rules, []);
    assert.deepEqual(insufficient.checkpoints[2].rules, []);
  });

  it("reaches F3 from the single critical rule", () => {
    const last = critical.checkpoints[4];
    const critic = last.rules.filter((r) => r.level === "F3");
    assert.deepEqual(critic.map((r) => r.id), ["heart-rate-critical"]);
    assert.deepEqual(signalOf(critical, 4, "heartRate").firedRuleIds, [
      "heart-rate-high",
      "heart-rate-critical",
    ]);
    assert.deepEqual(signalOf(critical, 4, "hrv").firedRuleIds, []);
  });

  it("summarizes baseline, latest value and deviation per signal", () => {
    const hrv = signalOf(fatigue, 4, "hrv");
    assert.equal(hrv.label, "Variabilidad cardíaca (HRV)");
    assert.equal(hrv.unit, "ms");
    assert.deepEqual(hrv.provenance, { type: "synthetic", source: "wearable-sim", device: "watch-sim" });
    assert.equal(hrv.baseline.status, "ready");
    if (hrv.baseline.status !== "ready") return;
    assert.equal(hrv.baseline.center, 52);
    assert.equal(hrv.baseline.sampleCount, 9);
    assert.ok(Math.abs(hrv.baseline.variability - 1.4826) < 1e-9);
    assert.ok(Math.abs(hrv.baseline.band.low - (52 - 2 * 1.4826)) < 1e-9);
    assert.ok(Math.abs(hrv.baseline.band.high - (52 + 2 * 1.4826)) < 1e-9);
    assert.deepEqual(hrv.latest, { value: 41, observedAt: "2026-11-15T08:00:00Z" });
    assert.ok(hrv.deviation);
    assert.equal(hrv.deviation.delta, -11);
    assert.ok(Math.abs((hrv.deviation.normalizedDelta ?? 0) - -11 / 1.4826) < 1e-9);
    assert.ok(hrv.firedRuleIds.includes("hrv-low-persistent"));
  });

  it("only exposes points up to the checkpoint, keeping the axis of the whole series", () => {
    const first = signalOf(fatigue, 0, "hrv");
    assert.equal(first.points.length, 11);
    assert.equal(first.totalPoints, 17);
    assert.equal(first.baselineEndIndex, 9);
    assert.equal(signalOf(fatigue, 4, "hrv").points.length, 15);
  });

  it("keeps a missing sensor reading as null with missing quality, never zero", () => {
    const gap = signalOf(fatigue, 0, "hrv").points[4];
    assert.equal(gap.value, null);
    assert.equal(gap.quality, "missing");
  });

  it("gives every checkpoint of a signal the same value domain, covering band and values", () => {
    const hrvDomains = fatigue.checkpoints.map((c) => c.signals.find((s) => s.signal === "hrv")?.domain);
    assert.ok(hrvDomains.every((d) => d && d.min === hrvDomains[0]?.min && d.max === hrvDomains[0]?.max));
    const hrv = signalOf(fatigue, 0, "hrv");
    if (hrv.baseline.status !== "ready") throw new Error("baseline expected");
    assert.ok(hrv.domain.min <= 38 && hrv.domain.min <= hrv.baseline.band.low);
    assert.ok(hrv.domain.max >= 53 && hrv.domain.max >= hrv.baseline.band.high);
  });

  it("flags an insufficient baseline without computing a deviation", () => {
    const hrv = signalOf(insufficient, 4, "hrv");
    assert.deepEqual(hrv.baseline, { status: "insufficient", sampleCount: 3, minObservations: 5 });
    assert.equal(hrv.deviation, null);
  });

  it("translates limitations into readable Spanish", () => {
    const texts = insufficient.checkpoints[0].limitations.map((l) => l.text);
    assert.deepEqual(texts, [
      "Variabilidad cardíaca (HRV): el baseline tiene menos de 5 observaciones válidas.",
      "Sueño: no hay observaciones válidas posteriores al baseline.",
    ]);
    assert.deepEqual(
      insufficient.checkpoints[0].limitations.map((l) => l.signal),
      ["hrv", "sleepHours"],
    );
    assert.deepEqual(fatigue.checkpoints[0].limitations, []);
  });
});

describe("translateLimitation", () => {
  it("covers every limitation code the engine emits", () => {
    assert.equal(
      translateLimitation("insufficient-baseline:hrv:mixed-units", 5).text,
      "Variabilidad cardíaca (HRV): el baseline mezcla unidades distintas y no es comparable.",
    );
    assert.equal(
      translateLimitation("zero-variability:fatigue", 5).text,
      "Fatiga autorreportada: el baseline no tiene variabilidad, así que no se puede normalizar la desviación.",
    );
  });

  it("does not hide codes it does not know", () => {
    assert.deepEqual(translateLimitation("something-new", 5), {
      code: "something-new",
      signal: null,
      text: "Limitación no reconocida (something-new).",
    });
  });
});

describe("matchesSubject", () => {
  it("compares the scenario subject with the crew member id", () => {
    assert.equal(matchesSubject(fatigue, "cm-01"), true);
    assert.equal(matchesSubject(fatigue, "cm-02"), false);
  });
});

describe("buildEvaluationBoard", () => {
  it("builds the views of several scenarios in the given order", () => {
    const board = buildEvaluationBoard(
      [load("critical-f3.json"), load("insufficient-data.json")],
      ruleSet,
      options,
    );
    assert.deepEqual(board.scenarios.map((s) => s.id), ["critical-f3", "insufficient-data"]);
  });
});
