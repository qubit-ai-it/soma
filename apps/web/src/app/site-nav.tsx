"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, activeItemId } from "@/features/navigation/nav.logic";
import { ONBOARDING_OPEN_EVENT } from "@/features/onboarding/onboarding.logic";
import { Icon } from "@/shared/ui/icon";

const PILL =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 font-heading text-sm font-semibold outline-none transition-colors duration-[var(--duration-micro)] focus-visible:ring-2 focus-visible:ring-ring";

export function SiteNav() {
  const active = activeItemId(usePathname());

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur">
      <nav
        aria-label="Navegación principal"
        className="container-soma flex items-center gap-2 overflow-x-auto py-3"
      >
        {NAV_ITEMS.map((item) => {
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
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))}
          className={`${PILL} ml-auto bg-card hover:bg-secondary`}
        >
          <Icon name="help" />
          Guía
        </button>
      </nav>
    </header>
  );
}
