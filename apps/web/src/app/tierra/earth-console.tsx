import type { EarthState } from "@/features/earth/earth.types";

import { LinkPanel } from "./link-panel";
import { ProposalCard } from "./proposal-card";
import { QueuePanel } from "./queue-panel";

export function EarthConsole({ state }: { state: EarthState }) {
  const packets = new Map(state.queue.map((packet) => [packet.id, packet]));

  return (
    <div className="space-y-10">
      <LinkPanel link={state.link} />
      <section aria-label="Propuestas de plan" className="space-y-3">
        <h2 className="text-xl font-heading font-bold">Propuestas pendientes de revisión</h2>
        <div className="space-y-3">
          {state.proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              packet={proposal.review ? packets.get(proposal.review.packetId) : undefined}
            />
          ))}
        </div>
      </section>
      <QueuePanel queue={state.queue} />
    </div>
  );
}
