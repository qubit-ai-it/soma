import { cn } from "cn";

export const SENTRY_STILL_SRC = "/mascot/sentry.png?v=2";

export function SentryStill({
  label = "Sentry",
  className,
  eager = false,
}: {
  label?: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a small static asset served with long cache headers
    <img
      src={SENTRY_STILL_SRC}
      alt={label}
      width={168}
      height={200}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cn("h-auto select-none", className)}
    />
  );
}
