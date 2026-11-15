import { getEcosystem } from "@/features/earth/ecosystem.server";

export async function GET() {
  const alerts = await getEcosystem().alertsRepo.list();
  return Response.json({ alerts }, { headers: { "cache-control": "no-store" } });
}
