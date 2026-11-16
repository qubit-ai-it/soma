import type { EarthState } from "@/features/earth/earth.types";
import type { WindowReport } from "@/features/followup/followup.record";
import type { PlanRecord } from "@/features/plan/plan.record";

import { FollowUpReportCard } from "./followup-report-card";
import { LinkPanel } from "./link-panel";
import { PlanReviewCard } from "./plan-review-card";
import { ProposalCard } from "./proposal-card";
import { QueuePanel } from "./queue-panel";

type FollowUpPending = { followUpId: string; subjectId: string; report: WindowReport };

export function EarthConsole({
  state,
  plans,
  reports,
}: {
  state: EarthState;
  plans: PlanRecord[];
  reports: FollowUpPending[];
}) {
  const packets = new Map(state.queue.map((packet) => [packet.id, packet]));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <LinkPanel link={state.link} />
        <QueuePanel queue={state.queue} />
      </div>
      {plans.length > 0 && (
        <section aria-label="Plans to review" className="space-y-3">
          <h2 className="font-heading text-xl font-bold">Plans to review</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanReviewCard key={`${plan.id}:${plan.revision}:${plan.reviews.length}`} plan={plan} />
            ))}
          </div>
        </section>
      )}
      {reports.length > 0 && (
        <section aria-label="Follow-up reports" className="space-y-3">
          <h2 className="font-heading text-xl font-bold">Follow-up reports</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((item) => (
              <FollowUpReportCard
                key={`${item.followUpId}:${item.report.windowId}`}
                followUpId={item.followUpId}
                subjectId={item.subjectId}
                report={item.report}
              />
            ))}
          </div>
        </section>
      )}
      <section aria-label="Plan proposals" className="space-y-3">
        <h2 className="font-heading text-xl font-bold">Proposals to review</h2>
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
