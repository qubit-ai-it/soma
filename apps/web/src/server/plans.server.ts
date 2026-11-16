import "server-only";

import { getEcosystem } from "../features/earth/ecosystem.server.ts";
import { RULE_LABEL } from "../features/evaluation/evaluation.labels.ts";
import { createPlanFlow, type PlanDraft, type PlanFlow } from "../features/plan/plan.flow.ts";
import { getProtocolLibrary } from "../features/protocols/protocols.queries.ts";
import { selectProtocols } from "../features/protocols/protocols.select.ts";
import { err, ok, type Result } from "../shared/result.ts";
import type { StoredEvaluation } from "../features/sentry/evaluations.repository.ts";
import { getNotificationsRepository, getPlansRepository } from "./repositories";
import { getServices } from "./services.ts";

const cache = globalThis as unknown as { somaPlanFlow?: PlanFlow };

async function draftFor(evaluation: StoredEvaluation): Promise<Result<PlanDraft>> {
  if (evaluation.status === "F3") {
    const library = await getProtocolLibrary();
    const steps = selectProtocols(evaluation, library.protocols).flatMap(({ protocol }) =>
      protocol.steps.map((step) => step.text),
    );
    if (steps.length === 0) return err("Sin protocolos aplicables.");
    return ok({
      steps,
      uncertainty: "Pasos de protocolos aprobados. En F3 la IA no redacta.",
      source: { provider: "protocolos aprobados", mode: "live" },
    });
  }
  const drafted = await getServices().planner.draft({
    riskLevel: "moderate",
    concerns: evaluation.triggeredRules.map((id) => RULE_LABEL[id] ?? id),
  });
  if (!drafted.ok) return drafted;
  return ok({
    steps: drafted.value.steps,
    uncertainty: drafted.value.uncertainty,
    source: { provider: drafted.value.source.provider, mode: drafted.value.source.mode },
  });
}

export function getPlanFlow(): PlanFlow {
  cache.somaPlanFlow ??= createPlanFlow({
    plans: getPlansRepository(),
    audit: getEcosystem().audit,
    notifications: getNotificationsRepository(),
    draft: draftFor,
    enqueue: (input) => getEcosystem().earth.enqueue(input),
    linkStatus: async () => (await getEcosystem().earth.getState()).link.status,
    labelFor: (subjectId) => `Tripulante ${subjectId}`,
    concernsFor: (evaluation) => evaluation.triggeredRules.map((id) => RULE_LABEL[id] ?? id),
  });
  return cache.somaPlanFlow;
}
