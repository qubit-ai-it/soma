import type { Role } from "../roles/roles.types.ts";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", label: "Inicio", href: "/", icon: "home" },
  { id: "report", label: "Reporte", href: "/reporte/cm-01", icon: "monitor_heart" },
  { id: "live", label: "En vivo", href: "/vivo", icon: "favorite" },
  { id: "xr", label: "XR", href: "/xr", icon: "view_in_ar" },
  { id: "earth", label: "Tierra", href: "/tierra", icon: "public" },
  { id: "alerts", label: "Alertas", href: "/alertas", icon: "notifications" },
  { id: "sentry", label: "Sentry", href: "/pet", icon: "smart_toy" },
  { id: "demo", label: "Demo", href: "/demo", icon: "play_circle" },
];

// Sections each role can use, in display order
const ITEMS_BY_ROLE: Record<Role, readonly string[]> = {
  astronaut: ["home", "report", "live", "xr", "sentry", "alerts", "demo"],
  cmo: ["home", "report", "alerts", "live", "xr", "sentry", "demo"],
  commander: ["home", "alerts", "sentry", "demo"],
  earth: ["home", "earth", "alerts", "demo"],
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
  ["/vivo", "live"],
  ["/xr", "xr"],
  ["/tierra", "earth"],
  ["/alertas", "alerts"],
  ["/pet", "sentry"],
  ["/demo", "demo"],
];

export function activeItemId(pathname: string): string | null {
  if (pathname === "/") return "home";
  for (const [prefix, id] of PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return id;
  }
  return null;
}
