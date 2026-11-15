"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, activeItemId, navItemsFor } from "@/features/navigation/nav.logic";
import { ONBOARDING_OPEN_EVENT } from "@/features/onboarding/onboarding.logic";
import { DEMO_ACTORS, ROLE_LABELS, isRole } from "@/features/roles/roles.logic";
import { setDemoRole, useDemoRole } from "@/features/roles/roles.store";
import { ROLES } from "@/features/roles/roles.types";
import { Icon } from "@/shared/ui/icon";

const PILL =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 font-heading text-sm font-semibold outline-none transition-colors duration-[var(--duration-micro)] focus-visible:ring-2 focus-visible:ring-ring";

export function SiteNav() {
  const active = activeItemId(usePathname());
  const role = useDemoRole();
  const items = navItemsFor(role, DEMO_ACTORS.astronaut.memberId ?? NAV_ITEMS[0].id);

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur">
      <nav
        aria-label="Navegación principal"
        className="container-soma flex items-center gap-2 overflow-x-auto py-3"
      >
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`${PILL} ${
                isActive ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}

        <label className={`${PILL} ml-auto bg-card`}>
          <Icon name="person" />
          <span className="sr-only">Rol activo</span>
          <select
            value={role}
            onChange={(event) => {
              if (isRole(event.target.value)) setDemoRole(event.target.value);
            }}
            className="cursor-pointer bg-transparent font-heading text-sm font-semibold outline-none"
          >
            {ROLES.map((value) => (
              <option key={value} value={value} className="bg-card text-foreground">
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))}
          className={`${PILL} bg-card hover:bg-secondary`}
        >
          <Icon name="help" />
          Guía
        </button>
      </nav>
    </header>
  );
}
