"use client";

import type { ReactNode } from "react";

import { ROLE_LABELS, canAccess } from "../roles.logic.ts";
import { useDemoRole } from "../roles.store.ts";
import type { Resource } from "../roles.types.ts";

type Props = {
  resource: Resource;
  children: ReactNode;
};

export function RoleGate({ resource, children }: Props) {
  const role = useDemoRole();
  if (canAccess(role, resource)) return <>{children}</>;
  return (
    <p role="status" className="rounded-2xl bg-card p-5 text-base text-ink">
      The {ROLE_LABELS[role]} role has no access. Switch roles above.
    </p>
  );
}
