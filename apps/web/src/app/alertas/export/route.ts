import { exportAudit } from "@/features/alerts/audit.logic";
import { getEcosystem } from "@/features/earth/ecosystem.server";

export async function GET() {
  const entries = await getEcosystem().audit.list();
  return new Response(exportAudit(entries, new Date().toISOString()), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="soma-audit-demo.json"',
      "cache-control": "no-store",
    },
  });
}
