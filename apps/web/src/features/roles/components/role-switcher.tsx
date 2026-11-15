"use client";

import { DEMO_ACTORS, ROLE_LABELS } from "../roles.logic.ts";
import { setDemoRole, useDemoRole } from "../roles.store.ts";
import { ROLES } from "../roles.types.ts";

export function RoleSwitcher() {
  const role = useDemoRole();

  return (
    <section aria-label="Selector de rol de demostración" className="space-y-2">
      <p className="text-sm text-ink">
        Selector de rol de demostración · sin autenticación
      </p>
      <div role="radiogroup" aria-label="Rol activo" className="flex flex-wrap gap-2">
        {ROLES.map((value) => {
          const active = value === role;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setDemoRole(value)}
              className={
                active
                  ? "rounded-full bg-primary px-4 py-1.5 font-heading text-sm font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  : "rounded-full bg-card px-4 py-1.5 font-heading text-sm font-semibold text-foreground outline-none transition-colors duration-[var(--duration-micro)] hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
              }
            >
              {active ? "Activo · " : ""}
              {ROLE_LABELS[value]}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-ink">
        Identidad simulada: {DEMO_ACTORS[role].label} ({DEMO_ACTORS[role].id}). Datos sintéticos.
      </p>
    </section>
  );
}
