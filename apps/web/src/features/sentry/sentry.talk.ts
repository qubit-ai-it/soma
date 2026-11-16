import type { Alert } from "../alerts/alerts.types.ts";
import { CREW_ALL, memberKey, roleKey } from "../notifications/notifications.logic.ts";
import type { NewNotification } from "../notifications/notifications.types.ts";
import type { Status } from "../rules/rules.types.ts";
import type { SpaceWeatherSnapshot } from "../space-weather/space-weather.port.ts";

export const SHIFT_HOURS_UTC = [6, 18] as const;
export const SHIFT_MS = 12 * 3_600_000;
export const CHECKIN_FROM_HOUR_UTC = 6;
export const SPACE_WEATHER_WINDOW_MS = 6 * 3_600_000;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export type Member = { id: string; label: string };

export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function checkinNotification(memberId: string, nowMs: number): NewNotification | null {
  if (new Date(nowMs).getUTCHours() < CHECKIN_FROM_HOUR_UTC) return null;
  return {
    dedupeKey: `checkin:sleep:${memberId}:${utcDay(nowMs)}`,
    kind: "checkin",
    priority: "normal",
    title: "How did you sleep?",
    body: "Tell Sentry in the chat.",
    memberId,
    audience: [memberKey(memberId)],
    payload: { topic: "sleep" },
  };
}

export function latestShiftBoundary(nowMs: number): number {
  const dayStart = Math.floor(nowMs / DAY_MS) * DAY_MS;
  const candidates = [-1, 0].flatMap((offset) =>
    SHIFT_HOURS_UTC.map((hour) => dayStart + offset * DAY_MS + hour * HOUR_MS),
  );
  return Math.max(...candidates.filter((boundary) => boundary <= nowMs));
}

function alertSummary(alerts: readonly Alert[]): string {
  if (alerts.length === 0) return "no alerts";
  const count = (level: Alert["level"]) => alerts.filter((a) => a.level === level).length;
  const parts = [
    count("F3") && `${count("F3")} F3`,
    count("F2") && `${count("F2")} F2`,
    count("NOT_EVALUABLE") && `${count("NOT_EVALUABLE")} not evaluable`,
  ].filter(Boolean);
  return `${alerts.length} ${alerts.length === 1 ? "alert" : "alerts"} (${parts.join(", ")})`;
}

export function shiftNotifications(
  boundaryMs: number,
  members: readonly Member[],
  alerts: readonly Alert[],
  statuses: Readonly<Record<string, Status | null>>,
): NewNotification[] {
  const previous = alerts.filter((a) => {
    const at = Date.parse(a.createdAt);
    return at >= boundaryMs - SHIFT_MS && at < boundaryMs;
  });
  const statusName = (status: Status | null | undefined) =>
    status === "NOT_EVALUABLE" ? "not evaluable" : (status ?? "not evaluated");

  const tally = new Map<string, number>();
  for (const member of members) {
    const name = statusName(statuses[member.id]);
    tally.set(name, (tally.get(name) ?? 0) + 1);
  }
  const now = [...tally].map(([name, n]) => `${n} ${name}`).join(", ");

  const crew: NewNotification = {
    dedupeKey: `shift:${boundaryMs}:crew`,
    kind: "summary",
    priority: "normal",
    title: "Shift change",
    body: `Previous shift: ${alertSummary(previous)}. Now: ${now}.`,
    audience: [roleKey("cmo"), roleKey("commander")],
    payload: { boundaryAt: new Date(boundaryMs).toISOString() },
  };

  const personal = members.map(
    (member): NewNotification => ({
      dedupeKey: `shift:${boundaryMs}:${member.id}`,
      kind: "summary",
      priority: "low",
      title: "Shift change",
      body: `Your previous shift: ${alertSummary(previous.filter((a) => a.memberId === member.id))}. Now: ${statusName(statuses[member.id])}.`,
      memberId: member.id,
      audience: [memberKey(member.id)],
      payload: { boundaryAt: new Date(boundaryMs).toISOString() },
    }),
  );
  return [crew, ...personal];
}

export function linkNotification(
  current: { status: "connected" | "disconnected"; updatedAt: string },
  last: { status: string } | null,
): NewNotification | null {
  if (last === null && current.status === "connected") return null;
  if (last?.status === current.status) return null;
  const lost = current.status === "disconnected";
  return {
    dedupeKey: `link:${current.status}:${current.updatedAt}`,
    kind: "link",
    priority: lost ? "high" : "normal",
    title: lost ? "Earth link lost" : "Earth link restored",
    body: lost ? "Without a link, the onboard physician decides." : "Queued packets will be sent.",
    audience: [roleKey("cmo"), roleKey("commander")],
    payload: { status: current.status },
  };
}

export function geomagneticScale(kp: number): number {
  const rounded = Math.round(kp);
  return rounded >= 5 ? Math.min(rounded - 4, 5) : 0;
}

export function protonScale(pfu: number): number {
  const thresholds = [10, 100, 1000, 10_000, 100_000];
  return thresholds.filter((t) => pfu >= t).length;
}

const SCALE_PRIORITY = (scale: number) => (scale >= 3 ? "high" : scale === 2 ? "normal" : "low");

export function spaceWeatherNotifications(snapshot: SpaceWeatherSnapshot, nowMs: number): NewNotification[] {
  if (snapshot.source.mode === "mock") return [];
  const bucket = Math.floor(nowMs / SPACE_WEATHER_WINDOW_MS);
  const origin = `${snapshot.source.provider} · ${snapshot.source.mode === "live" ? "live" : "cache"}`;
  const out: NewNotification[] = [];

  if (snapshot.kpIndex !== null) {
    const scale = geomagneticScale(snapshot.kpIndex);
    if (scale > 0) {
      out.push({
        dedupeKey: `spaceweather:G${scale}:${bucket}`,
        kind: "space_weather",
        priority: SCALE_PRIORITY(scale),
        title: `Geomagnetic storm G${scale}`,
        body: `Kp ${snapshot.kpIndex} · ${origin}`,
        audience: [CREW_ALL],
        payload: { scale: `G${scale}`, kp: snapshot.kpIndex, provider: snapshot.source.provider, mode: snapshot.source.mode },
      });
    }
  }
  if (snapshot.protonFluxPfu10Mev !== null) {
    const scale = protonScale(snapshot.protonFluxPfu10Mev);
    if (scale > 0) {
      out.push({
        dedupeKey: `spaceweather:S${scale}:${bucket}`,
        kind: "space_weather",
        priority: SCALE_PRIORITY(scale),
        title: `Solar protons S${scale}`,
        body: `${snapshot.protonFluxPfu10Mev} pfu · ${origin}`,
        audience: [CREW_ALL],
        payload: { scale: `S${scale}`, pfu: snapshot.protonFluxPfu10Mev, provider: snapshot.source.provider, mode: snapshot.source.mode },
      });
    }
  }
  return out;
}
