import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getPool } from "@/server/db";
import { ASSETS_BUCKET, getS3 } from "@/server/storage";

type Check = { ok: boolean; error?: string };

async function run(fn: () => Promise<void>): Promise<Check> {
  try {
    await fn();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "error" };
  }
}

export async function GET(request: Request) {
  void request.url;
  const postgres = await run(async () => {
    const { rows } = await getPool().query("select 1 as ok");
    if (rows[0]?.ok !== 1) throw new Error("unexpected result");
  });
  const storage = await run(async () => {
    const s3 = getS3();
    const Key = `health/${crypto.randomUUID()}.txt`;
    const payload = "soma-health";
    await s3.send(
      new PutObjectCommand({ Bucket: ASSETS_BUCKET, Key, Body: payload, ContentType: "text/plain" }),
    );
    const got = await s3.send(new GetObjectCommand({ Bucket: ASSETS_BUCKET, Key }));
    const text = await got.Body?.transformToString();
    if (text !== payload) throw new Error("roundtrip mismatch");
    await getSignedUrl(s3, new GetObjectCommand({ Bucket: ASSETS_BUCKET, Key }), { expiresIn: 60 });
    await s3.send(new DeleteObjectCommand({ Bucket: ASSETS_BUCKET, Key }));
  });
  const ok = postgres.ok && storage.ok;
  return Response.json(
    { ok, postgres, storage },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
