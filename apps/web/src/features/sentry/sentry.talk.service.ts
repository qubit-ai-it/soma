import type { Result } from "../../shared/result.ts";
import type { Alert } from "../alerts/alerts.types.ts";
import type { NotificationsRepository } from "../notifications/notifications.repository.ts";
import type { NewNotification } from "../notifications/notifications.types.ts";
import type { Status } from "../rules/rules.types.ts";
import type { SpaceWeatherSnapshot } from "../space-weather/space-weather.port.ts";
import {
  checkinNotification,
  latestShiftBoundary,
  linkNotification,
  shiftNotifications,
  spaceWeatherNotifications,
  type Member,
} from "./sentry.talk.ts";

type Deps = {
  notifications: NotificationsRepository;
  members: readonly Member[];
  alerts: () => Promise<Alert[]>;
  latestStatus: (memberId: string) => Promise<Status | null>;
  earthLink: () => Promise<{ status: "connected" | "disconnected"; updatedAt: string } | null>;
  spaceWeather: () => Promise<Result<SpaceWeatherSnapshot>>;
  throttleMs?: number;
};

export type SentryTalk = ReturnType<typeof createSentryTalk>;

export function createSentryTalk(deps: Deps) {
  let lastRun = 0;

  async function guard(build: () => Promise<NewNotification[]>): Promise<NewNotification[]> {
    try {
      return await build();
    } catch {
      return [];
    }
  }

  async function run(nowMs: number, options: { force?: boolean } = {}): Promise<{ added: number; skipped: boolean }> {
    if (!options.force && nowMs - lastRun < (deps.throttleMs ?? 60_000)) return { added: 0, skipped: true };
    lastRun = nowMs;

    const batches = await Promise.all([
      guard(async () =>
        deps.members.flatMap((member) => checkinNotification(member.id, nowMs) ?? []),
      ),
      guard(async () => {
        const statuses: Record<string, Status | null> = {};
        for (const member of deps.members) statuses[member.id] = await deps.latestStatus(member.id);
        return shiftNotifications(latestShiftBoundary(nowMs), deps.members, await deps.alerts(), statuses);
      }),
      guard(async () => {
        const link = await deps.earthLink();
        if (!link) return [];
        const last = await deps.notifications.latestOfKind("link");
        const status = last?.payload.status;
        const notice = linkNotification(link, typeof status === "string" ? { status } : null);
        return notice ? [notice] : [];
      }),
      guard(async () => {
        const snapshot = await deps.spaceWeather();
        return snapshot.ok ? spaceWeatherNotifications(snapshot.value, nowMs) : [];
      }),
    ]);

    let added = 0;
    for (const input of batches.flat()) {
      const result = await deps.notifications.add(input);
      if (!result.duplicate) added += 1;
    }
    return { added, skipped: false };
  }

  return { run };
}
