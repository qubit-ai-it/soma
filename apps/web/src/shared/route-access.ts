const AUTH_PAGES = ["/sign-in", "/sign-up"] as const;

const startsWithPage = (pathname: string, page: string) => pathname === page || pathname.startsWith(`${page}/`);

export function isAuthPath(pathname: string): boolean {
  return AUTH_PAGES.some((page) => startsWithPage(pathname, page));
}

// Static files served from public/ never need a session: the onboarding loads them before sign-up
const PUBLIC_ASSET_PREFIXES = ["/rive/", "/mascot/", "/models/"] as const;

export function isPublicAsset(pathname: string): boolean {
  return PUBLIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// "/" stays open because it hosts the onboarding for signed-out visitors
export function isPublicPage(pathname: string): boolean {
  return pathname === "/" || isAuthPath(pathname);
}
