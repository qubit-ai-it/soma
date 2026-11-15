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
    <p role="status" className="rounded-md bg-card p-4 text-sm text-ink">
      El rol activo ({ROLE_LABELS[role]}) no tiene acceso a esta sección. Cambia el rol en el
      selector de demostración.
    </p>
  );
}
