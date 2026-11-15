import { createHash } from "node:crypto";

import type { AuditEntry, NewAuditEntry } from "./alerts.types.ts";

export const GENESIS_HASH = "0".repeat(64);

type Unhashed = Omit<AuditEntry, "hash">;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function computeHash(entry: Unhashed): string {
  return createHash("sha256").update(canonical(entry)).digest("hex");
}

export function appendEntry(
  entries: readonly AuditEntry[],
  input: NewAuditEntry,
  meta: { id: string; at: string },
): { entries: AuditEntry[]; entry: AuditEntry; duplicate: boolean } {
  if (input.idempotencyKey) {
    const existing = entries.find((e) => e.idempotencyKey === input.idempotencyKey);
    if (existing) return { entries: [...entries], entry: existing, duplicate: true };
  }
  const last = entries.at(-1);
  const unhashed: Unhashed = {
    ...input,
    id: meta.id,
    seq: (last?.seq ?? 0) + 1,
    at: meta.at,
    prevHash: last?.hash ?? GENESIS_HASH,
  };
  const entry: AuditEntry = { ...unhashed, hash: computeHash(unhashed) };
  return { entries: [...entries, entry], entry, duplicate: false };
}

export function verifyChain(
  entries: readonly AuditEntry[],
): { valid: true } | { valid: false; brokenAtSeq: number } {
  let prevHash = GENESIS_HASH;
  for (const entry of entries) {
    const { hash, ...rest } = entry;
    if (entry.prevHash !== prevHash || computeHash(rest) !== hash) {
      return { valid: false, brokenAtSeq: entry.seq };
    }
    prevHash = hash;
  }
  return { valid: true };
}

export function exportAudit(entries: readonly AuditEntry[], exportedAt: string): string {
  return JSON.stringify(
    {
      exportedAt,
      note: "Solo se agregan entradas; la cadena de hashes detecta ediciones.",
      count: entries.length,
      chainValid: verifyChain(entries).valid,
      entries,
    },
    null,
    2,
  );
}
