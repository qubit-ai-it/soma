import type { EarthState } from "@/features/earth/earth.types";

import { LinkPanel } from "./link-panel";
import { ProposalCard } from "./proposal-card";
import { QueuePanel } from "./queue-panel";

export function EarthConsole({ state }: { state: EarthState }) {
  const packets = new Map(state.queue.map((packet) => [packet.id, packet]));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <LinkPanel link={state.link} />
        <QueuePanel queue={state.queue} />
      </div>
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
