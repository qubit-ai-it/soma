import { clerkMiddleware } from "@clerk/nextjs/server";

import { isPublicAsset, isPublicPage } from "./shared/route-access";

// Pages need a session; API routes answer 401 themselves; "/" stays open for the onboarding
export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/__clerk") || isPublicAsset(pathname) || isPublicPage(pathname)) return;
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
