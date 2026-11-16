import { randomUUID } from "node:crypto";

import { err, type Result } from "../../shared/result.ts";
import type { AuditRepository } from "../alerts/alerts.repository.ts";
import { applyReview, enqueuePacket, processQueue, setLink } from "./earth.logic.ts";
import type { EarthRepository } from "./earth.repository.ts";
import type {
  Delivery,
  EarthState,
  LinkPatch,
  NewPacket,
  Packet,
  Proposal,
  ReviewInput,
} from "./earth.types.ts";

type Deps = {
  repo: EarthRepository;
  audit: AuditRepository;
  now?: () => string;
  makeId?: () => string;
  onFlushed?: (state: EarthState) => Promise<void>;
};

export type EarthService = ReturnType<typeof createEarthService>;

export function createEarthService({
  repo,
  audit,
  now = () => new Date().toISOString(),
  makeId = () => randomUUID(),
  onFlushed,
}: Deps) {
  // Effects are idempotent (audit keys), so applying them to duplicate deliveries is safe
  async function applyEffects(deliveries: Delivery[], proposals: Proposal[]): Promise<void> {
    for (const { packet } of deliveries) {
      if (packet.kind === "plan_response") {
        const proposal = proposals.find((p) => p.id === packet.payload.proposalId);
        const review = proposal?.review;
        if (!proposal || !review) continue;
        await audit.append({
          action: "plan_review",
          actor: { kind: "human", id: review.actorId, role: "earth" },
          subjectId: proposal.subject.memberId,
          detail: "Propuesta de IA revisada por un médico de Tierra; respuesta confirmada por la cola",
          aiProposal: {
            proposalId: proposal.id,
            title: proposal.title,
            steps: proposal.steps,
            provider: proposal.source.provider,
            version: proposal.source.version,
          },
          humanDecision: {
            decision: review.decision,
            note: review.note,
            ...(review.steps ? { steps: review.steps } : {}),
          },
          idempotencyKey: packet.idempotencyKey,
        });
      } else if (packet.kind === "alert_notification") {
        const alertId = typeof packet.payload.alertId === "string" ? packet.payload.alertId : undefined;
        await audit.append({
          action: "alert_escalated",
          actor: { kind: "system", id: "deterministic-engine" },
          ...(alertId ? { alertId } : {}),
          subjectId: String(packet.payload.subjectRef ?? ""),
          detail: "Notificación mínima (estado y acción) entregada a Tierra",
          idempotencyKey: `escalated:${packet.idempotencyKey}`,
        });
      }
    }
  }

  async function flush(options: { force?: boolean } = {}): Promise<Delivery[]> {
    const { deliveries, proposals, after } = await repo.mutate((state) => {
      const outcome = processQueue(state, now(), options);
      return {
        state: outcome.state,
        result: { deliveries: outcome.deliveries, proposals: outcome.state.proposals, after: outcome.state },
      };
    });
    await applyEffects(deliveries, proposals);
    await onFlushed?.(after);
    return deliveries;
  }

  return {
    getState: (): Promise<EarthState> => repo.read(),

    setLink: (patch: LinkPatch): Promise<void> =>
      repo.mutate((state) => ({ state: setLink(state, patch, now()), result: undefined })),

    enqueue: (input: Omit<NewPacket, "id">): Promise<{ packet: Packet; duplicate: boolean }> =>
      repo.mutate((state) => {
        const queued = enqueuePacket(state, { ...input, id: makeId() }, now());
        return {
          state: queued.state,
          result: { packet: queued.packet, duplicate: queued.duplicate },
        };
      }),

    flush,

    async review(input: ReviewInput, actorId: string): Promise<Result<Packet>> {
      const outcome = await repo.mutate((state) => {
        const result = applyReview(state, { ...input, actorId, packetId: makeId(), now: now() });
        if (!result.ok) return { state, result: err(result.error) as Result<Packet> };
        return { state: result.value.state, result: { ok: true, value: result.value.packet } as Result<Packet> };
      });
      return outcome;
    },
  };
}
