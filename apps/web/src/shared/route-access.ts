const AUTH_PAGES = ["/sign-in", "/sign-up"] as const;

const startsWithPage = (pathname: string, page: string) => pathname === page || pathname.startsWith(`${page}/`);

export function isAuthPath(pathname: string): boolean {
  return AUTH_PAGES.some((page) => startsWithPage(pathname, page));
}

// "/" stays open because it hosts the onboarding for signed-out visitors
export function isPublicPage(pathname: string): boolean {
  return pathname === "/" || isAuthPath(pathname);
}
