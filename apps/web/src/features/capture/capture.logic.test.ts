import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isEvaluable } from "../observation/observation.logic.ts";
import { observationSchema } from "../observation/observation.schema.ts";
import {
  assessImageQuality,
  captureToObservation,
  measureLuminance,
} from "./capture.logic.ts";
import type { ImageMeasures } from "./capture.types.ts";

const good: ImageMeasures = {
  width: 640,
  height: 480,
  bytes: 48_000,
  meanBrightness: 110,
  contrast: 45,
};

function patched(patch: Partial<ImageMeasures>): ImageMeasures {
  return { ...good, ...patch };
}

describe("assessImageQuality", () => {
  it("accepts a well exposed image with contrast", () => {
    assert.deepEqual(assessImageQuality(good), { state: "valid" });
  });

  it("rejects a tiny image", () => {
    const result = assessImageQuality(patched({ width: 64, height: 64 }));
    assert.equal(result.state, "invalid");
    assert.match(result.reason ?? "", /small/);
  });

  it("rejects an almost empty file", () => {
    assert.equal(assessImageQuality(patched({ bytes: 500 })).state, "invalid");
  });

  it("rejects a black image", () => {
    const result = assessImageQuality(patched({ meanBrightness: 8 }));
    assert.equal(result.state, "invalid");
    assert.match(result.reason ?? "", /dark/);
  });

  it("rejects a washed out image", () => {
    const result = assessImageQuality(patched({ meanBrightness: 245 }));
    assert.equal(result.state, "invalid");
    assert.match(result.reason ?? "", /overexposed/);
  });

  it("rejects a flat image without contrast", () => {
    const result = assessImageQuality(patched({ contrast: 2 }));
    assert.equal(result.state, "invalid");
    assert.match(result.reason ?? "", /contrast/);
  });

  it("marks a borderline dim image as suspect", () => {
    const result = assessImageQuality(patched({ meanBrightness: 38 }));
    assert.equal(result.state, "suspect");
    assert.ok(result.reason);
  });

  it("marks low contrast as suspect", () => {
    assert.equal(assessImageQuality(patched({ contrast: 14 })).state, "suspect");
  });

  it("marks a low resolution image as suspect", () => {
    assert.equal(assessImageQuality(patched({ width: 200, height: 150 })).state, "suspect");
  });

  it("treats non finite measures as invalid, never as valid", () => {
    const result = assessImageQuality(patched({ meanBrightness: Number.NaN }));
    assert.equal(result.state, "invalid");
  });

  it("keeps the worst verdict when several checks fail", () => {
    const result = assessImageQuality(patched({ contrast: 14, meanBrightness: 5 }));
    assert.equal(result.state, "invalid");
  });
});

describe("measureLuminance", () => {
  it("returns zeros for an all black buffer", () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]);
    assert.deepEqual(measureLuminance(data), { meanBrightness: 0, contrast: 0 });
  });

  it("measures mean and spread of a black and white buffer", () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    const { meanBrightness, contrast } = measureLuminance(data);
    assert.ok(Math.abs(meanBrightness - 127.5) < 0.01);
    assert.ok(Math.abs(contrast - 127.5) < 0.01);
  });

  it("returns non finite measures for an empty buffer", () => {
    const { meanBrightness } = measureLuminance(new Uint8ClampedArray());
    assert.ok(!Number.isFinite(meanBrightness));
  });
});

describe("captureToObservation", () => {
  const base = {
    id: "obs-1",
    subjectId: "cm-01",
    imageRef: "ultrasound-1.jpg",
    observedAt: "2026-11-15T10:00:00.000Z",
  };

  it("builds a valid observation with XR provenance", () => {
    const obs = captureToObservation({ ...base, assessment: { state: "valid" }, synthetic: false });
    assert.equal(obs.signal, "ultrasoundImage");
    assert.equal(obs.unit, "image");
    assert.equal(obs.value, "ultrasound-1.jpg");
    assert.deepEqual(obs.provenance, { type: "real", source: "self-collected, XR-guided" });
    assert.deepEqual(obs.quality, { state: "valid" });
    assert.ok(observationSchema.safeParse(obs).success);
    assert.equal(isEvaluable(obs), true);
  });

  it("marks demonstration captures as synthetic", () => {
    const obs = captureToObservation({ ...base, assessment: { state: "valid" }, synthetic: true });
    assert.equal(obs.provenance.type, "synthetic");
    assert.equal(obs.provenance.source, "self-collected, XR-guided");
  });

  it("carries the quality reason and is not evaluable when poor", () => {
    const obs = captureToObservation({
      ...base,
      assessment: { state: "invalid", reason: "Dark image" },
      synthetic: true,
    });
    assert.deepEqual(obs.quality, { state: "invalid", reason: "Dark image" });
    assert.ok(observationSchema.safeParse(obs).success);
    assert.equal(isEvaluable(obs), false);
  });

  it("includes the device when given", () => {
    const obs = captureToObservation({
      ...base,
      assessment: { state: "valid" },
      synthetic: false,
      device: "Meta Quest",
    });
    assert.equal(obs.provenance.device, "Meta Quest");
  });
});
