import { S3Client } from "@aws-sdk/client-s3";

export const ASSETS_BUCKET = "assets";
export const EXPERIENCES_BUCKET = "xps";

const globalForS3 = globalThis as unknown as { somaS3?: S3Client };

export function getS3(): S3Client {
  if (!globalForS3.somaS3) {
    globalForS3.somaS3 = new S3Client({ forcePathStyle: true });
  }
  return globalForS3.somaS3;
}
