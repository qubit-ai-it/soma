const TICK_MS = 5000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.SENTRY_SIMULATOR === "off" || !process.env.DATABASE_URL) return;

  const state = globalThis as unknown as { somaSentryTimer?: ReturnType<typeof setInterval> };
  if (state.somaSentryTimer) return;

  const { getSentry } = await import("./server/sentry.server");
  let running = false;
  state.somaSentryTimer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await getSentry().tick(Date.now());
    } catch (error) {
      console.error("sentry tick failed", error instanceof Error ? error.message : error);
    } finally {
      running = false;
    }
  }, TICK_MS);
}
