import { cn } from "cn";

export const SENTRY_STILL_SRC = "/mascot/sentry.png?v=1";

export function SentryStill({ label = "Sentry", className }: { label?: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a small static asset served with long cache headers
    <img
      src={SENTRY_STILL_SRC}
      alt={label}
      width={168}
      height={200}
      loading="lazy"
      decoding="async"
      className={cn("h-auto select-none", className)}
    />
  );
}
