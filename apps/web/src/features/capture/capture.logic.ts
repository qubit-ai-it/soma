import type { Observation } from "../observation/observation.types.ts";
import type {
  CaptureInput,
  ImageMeasures,
  QualityAssessment,
  QualityVerdict,
} from "./capture.types.ts";

export const CAPTURE_SIGNAL = "ultrasoundImage";
export const CAPTURE_SOURCE = "self-collected, XR-guided";

const LIMITS = {
  invalid: { minSide: 100, minBytes: 2_000, minBrightness: 20, maxBrightness: 240, minContrast: 5 },
  suspect: { minSide: 256, minBrightness: 50, maxBrightness: 210, minContrast: 20 },
};

type Finding = { state: QualityVerdict; reason: string };

function findings(m: ImageMeasures): Finding[] {
  const out: Finding[] = [];
  const side = Math.min(m.width, m.height);

  if (![m.width, m.height, m.bytes, m.meanBrightness, m.contrast].every(Number.isFinite)) {
    return [{ state: "invalid", reason: "Could not measure the image: incomplete data." }];
  }
  if (side < LIMITS.invalid.minSide) {
    out.push({ state: "invalid", reason: "Image too small to evaluate." });
  } else if (side < LIMITS.suspect.minSide) {
    out.push({ state: "suspect", reason: "Low resolution: consider repeating the capture." });
  }
  if (m.bytes < LIMITS.invalid.minBytes) {
    out.push({ state: "invalid", reason: "File is almost empty." });
  }
  if (m.meanBrightness < LIMITS.invalid.minBrightness) {
    out.push({ state: "invalid", reason: "Image too dark." });
  } else if (m.meanBrightness < LIMITS.suspect.minBrightness) {
    out.push({ state: "suspect", reason: "Dark image: consider adjusting the gain." });
  }
  if (m.meanBrightness > LIMITS.invalid.maxBrightness) {
    out.push({ state: "invalid", reason: "Image overexposed." });
  } else if (m.meanBrightness > LIMITS.suspect.maxBrightness) {
    out.push({ state: "suspect", reason: "Very bright image: consider adjusting the gain." });
  }
  if (m.contrast < LIMITS.invalid.minContrast) {
    out.push({ state: "invalid", reason: "Image has no contrast: structures cannot be distinguished." });
  } else if (m.contrast < LIMITS.suspect.minContrast) {
    out.push({ state: "suspect", reason: "Low contrast: consider adjusting the depth." });
  }
  return out;
}

export function assessImageQuality(measures: ImageMeasures): QualityAssessment {
  const all = findings(measures);
  if (all.length === 0) return { state: "valid" };
  const worst = all.find((f) => f.state === "invalid") ?? all[0];
  return { state: worst.state, reason: worst.reason };
}

// RGBA bytes in, Rec. 709 luminance out; contrast is the standard deviation
export function measureLuminance(rgba: Uint8ClampedArray): {
  meanBrightness: number;
  contrast: number;
} {
  const pixels = Math.floor(rgba.length / 4);
  if (pixels === 0) return { meanBrightness: Number.NaN, contrast: Number.NaN };

  let sum = 0;
  let sumSquares = 0;
  for (let i = 0; i < pixels; i += 1) {
    const luma = 0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2];
    sum += luma;
    sumSquares += luma * luma;
  }
  const mean = sum / pixels;
  const variance = Math.max(0, sumSquares / pixels - mean * mean);
  return { meanBrightness: mean, contrast: Math.sqrt(variance) };
}

export function captureToObservation(input: CaptureInput): Observation {
  const { assessment } = input;
  return {
    id: input.id,
    subjectId: input.subjectId,
    signal: CAPTURE_SIGNAL,
    value: input.imageRef,
    unit: "image",
    observedAt: input.observedAt,
    provenance: {
      type: input.synthetic ? "synthetic" : "real",
      source: CAPTURE_SOURCE,
      ...(input.device === undefined ? {} : { device: input.device }),
    },
    quality:
      assessment.reason === undefined
        ? { state: assessment.state }
        : { state: assessment.state, reason: assessment.reason },
  };
}
