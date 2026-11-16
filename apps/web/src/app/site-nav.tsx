"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AlertTray } from "@/features/alerts/components/alert-tray";
import { NAV_ITEMS, activeItemId, navItemsFor } from "@/features/navigation/nav.logic";
import { DEMO_ACTORS, ROLE_LABELS, isRole } from "@/features/roles/roles.logic";
import { setDemoRole, useDemoRole } from "@/features/roles/roles.store";
import { ROLES } from "@/features/roles/roles.types";
import { Icon } from "@/shared/ui/icon";

const PILL =
  "inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-full px-0 font-heading text-sm font-semibold outline-none transition-colors duration-[var(--duration-micro)] focus-visible:ring-2 focus-visible:ring-ring sm:px-4";

export function SiteNav() {
  const active = activeItemId(usePathname());
  const role = useDemoRole();
  const items = navItemsFor(role, DEMO_ACTORS.astronaut.memberId ?? NAV_ITEMS[0].id);

  return (
    <div
      suppressHydrationWarning
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3"
    >
      <nav
        aria-label="Navegación principal"
        className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-3xl bg-card/90 p-1.5 shadow-[0_18px_55px_-20px_rgb(255_255_255/0.14)] backdrop-blur"
      >
        {items.map((item) => {
          const isActive = item.id === active;
          const style = `${PILL} ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`;
          if (item.id === "alerts") return <AlertTray key={item.id} className={style} />;
          if (!item.href) return null;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
              className={style}
            >
              <Icon name={item.icon} />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}

        <label className={`${PILL} bg-secondary px-3`} title="Rol activo">
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
      </nav>
    </div>
  );
}
