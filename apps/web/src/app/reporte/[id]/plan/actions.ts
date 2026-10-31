"use server";

import { z } from "zod";

import { getMissionMember } from "@/features/crew/crew.queries";
import { getPlanDraft } from "@/features/plan/plan.queries";
import type { PlanActionState } from "@/features/plan/plan.types";
import { getRisk } from "@/features/risk/risk.queries";
import { toRiskInput } from "../../../risk-request";

const memberIdSchema = z.string().trim().min(1).max(64);

const failure = (message: string): PlanActionState => ({ status: "error", message });

// Only the id comes from the client; risk and signals are resolved here
export async function generatePlan(
  memberId: string,
  // required by useActionState, unused
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _previous: PlanActionState,
): Promise<PlanActionState> {
  const id = memberIdSchema.safeParse(memberId);
  if (!id.success) return failure("Tripulante no válido.");

  const member = await getMissionMember(id.data);
  if (!member) return failure("Tripulante no encontrado.");

  const risk = await getRisk(toRiskInput(member));
  if (!risk) return failure("No se pudo clasificar el riesgo; no se generó el borrador.");

  const plan = await getPlanDraft({
    riskLevel: risk.level,
    concerns: member.flags.map((flag) => flag.label),
  });
  if (!plan.ok) return failure("No se pudo generar el borrador. Inténtalo de nuevo.");

  return { status: "ready", plan: plan.value };
}
