import type { QualityState } from "../observation/observation.types.ts";

export type ImageMeasures = {
  width: number;
  height: number;
  bytes: number;
  meanBrightness: number;
  contrast: number;
};

export type QualityVerdict = Exclude<QualityState, "missing">;

export type QualityAssessment = {
  state: QualityVerdict;
  reason?: string;
};

export type CaptureInput = {
  id: string;
  subjectId: string;
  imageRef: string;
  observedAt: string;
  assessment: QualityAssessment;
  synthetic: boolean;
  device?: string;
};
