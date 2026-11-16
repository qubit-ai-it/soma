import type { Role } from "../roles/roles.types.ts";

export type NavItem = {
  id: string;
  label: string;
  // Items without an href open a panel instead of a page
  href?: string;
  icon: string;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", label: "Home", href: "/", icon: "home" },
  { id: "report", label: "Report", href: "/reporte/cm-01", icon: "monitor_heart" },
  { id: "devices", label: "Devices", href: "/dispositivos", icon: "devices" },
  { id: "earth", label: "Earth", href: "/tierra", icon: "public" },
  { id: "alerts", label: "Alerts", icon: "notifications" },
  { id: "sentry", label: "Sentry", href: "/pet", icon: "smart_toy" },
];

// Sections each role can use, in display order
const ITEMS_BY_ROLE: Record<Role, readonly string[]> = {
  astronaut: ["home", "report", "devices", "sentry", "alerts"],
  cmo: ["home", "report", "alerts", "devices", "sentry"],
  commander: ["home", "alerts", "sentry"],
  earth: ["home", "earth", "alerts"],
};

export function navItemsFor(role: Role, astronautMemberId: string): NavItem[] {
  return ITEMS_BY_ROLE[role]
    .flatMap((id) => NAV_ITEMS.filter((item) => item.id === id))
    .map((item) =>
      item.id === "report" && role === "astronaut"
        ? { ...item, href: `/reporte/${astronautMemberId}` }
        : item,
    );
}

const PREFIXES: readonly (readonly [string, string])[] = [
  ["/reporte", "report"],
  ["/dispositivos", "devices"],
  ["/tierra", "earth"],
  ["/pet", "sentry"],
];

export function activeItemId(pathname: string): string | null {
  if (pathname === "/") return "home";
  for (const [prefix, id] of PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return id;
  }
  return null;
}
