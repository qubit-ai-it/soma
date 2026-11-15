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

const ORDER_BY_ROLE: Record<Role, readonly string[]> = {
  astronaut: ["home", "report", "live", "xr", "sentry", "alerts", "earth", "demo"],
  cmo: ["home", "report", "alerts", "live", "xr", "sentry", "earth", "demo"],
  commander: ["home", "alerts", "report", "sentry", "demo", "live", "xr", "earth"],
  earth: ["home", "earth", "alerts", "report", "sentry", "demo", "live", "xr"],
};

export function navItemsFor(role: Role, astronautMemberId: string): NavItem[] {
  const order = ORDER_BY_ROLE[role];
  return [...NAV_ITEMS]
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
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
