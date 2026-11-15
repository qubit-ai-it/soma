import type { z } from "zod";

import type {
  earthStateSchema,
  linkPatchSchema,
  linkSchema,
  packetSchema,
  proposalSchema,
  receiptSchema,
  reviewInputSchema,
} from "./earth.schema.ts";

export type Packet = z.infer<typeof packetSchema>;
export type PacketKind = Packet["kind"];
export type Direction = Packet["direction"];
export type LinkState = z.infer<typeof linkSchema>;
export type LinkPatch = z.infer<typeof linkPatchSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type EarthState = z.infer<typeof earthStateSchema>;
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export type NewPacket = {
  id: string;
  idempotencyKey: string;
  kind: PacketKind;
  direction: Direction;
  payload: Packet["payload"];
};

export type Delivery = {
  packet: Packet;
  duplicate: boolean;
};
