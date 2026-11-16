import { err, ok, type Result } from "../../shared/result.ts";
import { fitWithin, MAX_IMAGE_SIDE } from "../pet/image.ts";
import { assessImageQuality, measureLuminance } from "./capture.logic.ts";
import type { ImageMeasures, QualityAssessment } from "./capture.types.ts";

export type ReadCapture = {
  dataUrl: string;
  measures: ImageMeasures;
  assessment: QualityAssessment;
};

export async function readCapture(file: File): Promise<Result<ReadCapture>> {
  if (!file.type.startsWith("image/")) return err("The file is not an image.");

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_IMAGE_SIDE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) {
      bitmap.close();
      return err("The browser could not process the image.");
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const { meanBrightness, contrast } = measureLuminance(
      context.getImageData(0, 0, width, height).data,
    );
    const measures: ImageMeasures = {
      width,
      height,
      bytes: file.size,
      meanBrightness,
      contrast,
    };
    return ok({
      dataUrl: canvas.toDataURL("image/jpeg", 0.8),
      measures,
      assessment: assessImageQuality(measures),
    });
  } catch {
    return err("Could not read the image.");
  }
}
