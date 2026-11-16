import type { EarthState } from "@/features/earth/earth.types";
import type { PlanRecord } from "@/features/plan/plan.record";

import { LinkPanel } from "./link-panel";
import { PlanReviewCard } from "./plan-review-card";
import { ProposalCard } from "./proposal-card";
import { QueuePanel } from "./queue-panel";

export function EarthConsole({ state, plans }: { state: EarthState; plans: PlanRecord[] }) {
  const packets = new Map(state.queue.map((packet) => [packet.id, packet]));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <LinkPanel link={state.link} />
        <QueuePanel queue={state.queue} />
      </div>
      {plans.length > 0 && (
        <section aria-label="Planes por revisar" className="space-y-3">
          <h2 className="font-heading text-xl font-bold">Planes por revisar</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanReviewCard key={`${plan.id}:${plan.revision}:${plan.reviews.length}`} plan={plan} />
            ))}
          </div>
        </section>
      )}
      <section aria-label="Propuestas de plan" className="space-y-3">
        <h2 className="font-heading text-xl font-bold">Propuestas por revisar</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              packet={proposal.review ? packets.get(proposal.review.packetId) : undefined}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
