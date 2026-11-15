export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", label: "Inicio", href: "/", icon: "home" },
  { id: "report", label: "Reporte", href: "/reporte/cm-01", icon: "monitor_heart" },
  { id: "xr", label: "XR", href: "/xr", icon: "view_in_ar" },
  { id: "earth", label: "Tierra", href: "/tierra", icon: "public" },
  { id: "alerts", label: "Alertas", href: "/alertas", icon: "notifications" },
  { id: "sentry", label: "Sentry", href: "/pet", icon: "smart_toy" },
  { id: "demo", label: "Demo", href: "/demo", icon: "play_circle" },
];

const PREFIXES: readonly (readonly [string, string])[] = [
  ["/reporte", "report"],
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
