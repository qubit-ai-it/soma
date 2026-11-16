import { cn } from "cn";

export type SentryStillState = "idle" | "warning" | "success";

// Bump a version whenever its file changes: these files are cached for a year
export const SENTRY_STILL_SRC: Record<SentryStillState, string> = {
  idle: "/mascot/sentry.png?v=3",
  warning: "/mascot/sentry-warning.png?v=1",
  success: "/mascot/sentry-success.png?v=1",
};

export function SentryStill({
  label = "Sentry",
  state = "idle",
  className,
  eager = false,
}: {
  label?: string;
  state?: SentryStillState;
  className?: string;
  eager?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a small static asset served with long cache headers
    <img
      src={SENTRY_STILL_SRC[state]}
      alt={label}
      width={168}
      height={166}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cn("h-auto select-none", className)}
    />
  );
}
