import { createHash } from "node:crypto";

export function memberIdForUser(userId: string): string {
  return `cm-${createHash("sha256").update(userId).digest("hex").slice(0, 8)}`;
}
