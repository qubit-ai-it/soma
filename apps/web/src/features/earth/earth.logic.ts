import { err, ok, type Result } from "../../shared/result.ts";
import type {
  Delivery,
  EarthState,
  LinkPatch,
  NewPacket,
  Packet,
  ReviewInput,
} from "./earth.types.ts";

export const BASE_BACKOFF_MS = 2000;
export const MAX_BACKOFF_MS = 60_000;
export const MAX_ATTEMPTS = 8;

export function backoffMs(attempts: number): number {
  const exponent = Math.max(attempts, 1) - 1;
  return Math.min(BASE_BACKOFF_MS * 2 ** exponent, MAX_BACKOFF_MS);
}

function plus(iso: string, ms: number): string {
  return new Date(Date.parse(iso) + ms).toISOString();
}

export function enqueuePacket(
  state: EarthState,
  input: NewPacket,
  now: string,
): { state: EarthState; packet: Packet; duplicate: boolean } {
  const existing = state.queue.find((p) => p.idempotencyKey === input.idempotencyKey);
  if (existing) return { state, packet: existing, duplicate: true };

  const packet: Packet = {
    ...input,
    seq: state.nextSeq,
    createdAt: now,
    status: "queued",
    attempts: 0,
    nextAttemptAt: now,
  };
  return {
    state: { ...state, nextSeq: state.nextSeq + 1, queue: [...state.queue, packet] },
    packet,
    duplicate: false,
  };
}

export function processQueue(
  state: EarthState,
  now: string,
  options: { force?: boolean } = {},
): { state: EarthState; deliveries: Delivery[] } {
  const deliveries: Delivery[] = [];
  const inbox = [...state.inbox];
  const nowMs = Date.parse(now);
  const order = [...state.queue].sort((a, b) => a.seq - b.seq);
  const updated = new Map<string, Packet>();

  for (const packet of order) {
    if (packet.status !== "queued") continue;
    if (!options.force && Date.parse(packet.nextAttemptAt) > nowMs) continue;

    const attempts = packet.attempts + 1;
    const attempted: Packet = { ...packet, attempts, lastAttemptAt: now };
    let lastError: string | undefined;

    if (state.link.status === "disconnected") {
      lastError = "link_down";
    } else {
      const duplicate = inbox.some((r) => r.idempotencyKey === packet.idempotencyKey);
      if (!duplicate) {
        inbox.push({
          idempotencyKey: packet.idempotencyKey,
          packetId: packet.id,
          direction: packet.direction,
          receivedAt: plus(now, state.link.latencyMs),
        });
      }
      deliveries.push({ packet, duplicate });
      if (state.link.ackLoss) lastError = "ack_lost";
    }

    if (lastError === undefined) {
      updated.set(packet.id, {
        ...attempted,
        status: "acked",
        ackedAt: plus(now, state.link.latencyMs),
        lastError: undefined,
      });
    } else if (attempts >= MAX_ATTEMPTS) {
      updated.set(packet.id, { ...attempted, status: "failed", lastError });
    } else {
      updated.set(packet.id, {
        ...attempted,
        lastError,
        nextAttemptAt: plus(now, backoffMs(attempts)),
      });
    }
  }

  return {
    state: { ...state, inbox, queue: state.queue.map((p) => updated.get(p.id) ?? p) },
    deliveries,
  };
}

export function setLink(state: EarthState, patch: LinkPatch, now: string): EarthState {
  return { ...state, link: { ...state.link, ...patch, updatedAt: now } };
}

type ReviewContext = {
  actorId: string;
  packetId: string;
  now: string;
};

export function applyReview(
  state: EarthState,
  input: ReviewInput & ReviewContext,
): Result<{ state: EarthState; packet: Packet }> {
  const actorId = input.actorId.trim();
  if (!actorId) return err("A review needs an identified reviewer");

  const proposal = state.proposals.find((p) => p.id === input.proposalId);
  if (!proposal) return err("Proposal not found");
  if (proposal.review) return err("Proposal already reviewed");

  const steps = input.decision === "modify" ? input.steps : undefined;
  const note = input.note;

  const queued = enqueuePacket(
    state,
    {
      id: input.packetId,
      idempotencyKey: `plan-response:${proposal.id}`,
      kind: "plan_response",
      direction: "to_station",
      payload: {
        proposalId: proposal.id,
        decision: input.decision,
        note,
        reviewerId: actorId,
        ...(steps ? { steps } : {}),
      },
    },
    input.now,
  );

  const review = {
    decision: input.decision,
    note,
    actorId,
    decidedAt: input.now,
    packetId: queued.packet.id,
    ...(steps ? { steps } : {}),
  };
  return ok({
    packet: queued.packet,
    state: {
      ...queued.state,
      proposals: state.proposals.map((p) => (p.id === proposal.id ? { ...p, review } : p)),
    },
  });
}
