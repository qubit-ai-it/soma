import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getSessionCaller } from "@/features/roles/roles.session";
import { CPR_EXPERIENCE } from "@/features/simulation/simulation.experience";
import { EXPERIENCES_BUCKET, getS3 } from "@/server/storage";

const EXPIRES_IN_SECONDS = 900;

export async function GET() {
  if (!(await getSessionCaller())) {
    return Response.json({ error: "Sign in to watch the experience." }, { status: 401 });
  }
  try {
    const url = await getSignedUrl(
      getS3(),
      new GetObjectCommand({
        Bucket: EXPERIENCES_BUCKET,
        Key: CPR_EXPERIENCE.videoKey,
        ResponseContentType: "video/mp4",
      }),
      { expiresIn: EXPIRES_IN_SECONDS },
    );
    return new Response(null, { status: 302, headers: { location: url, "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "The experience video is not available." }, { status: 502 });
  }
}
