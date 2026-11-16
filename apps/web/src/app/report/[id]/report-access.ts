import { canAccess } from "../../../features/roles/roles.logic.ts";
import type { Role } from "../../../features/roles/roles.types.ts";

type Caller = { role: Role; memberId: string | null };

// Astronauts open only their own report; cmo, commander and earth keep their current access
export function canOpenReport(caller: Caller, reportMemberId: string): boolean {
  if (caller.role !== "astronaut") return true;
  return canAccess("astronaut", "clinical_detail", { ownData: caller.memberId === reportMemberId });
}
