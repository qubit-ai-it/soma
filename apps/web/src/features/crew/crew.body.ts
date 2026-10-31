import { THRESHOLDS } from "./crew.logic.ts";
import type {
  CrewMember,
  Severity,
  Signal,
  Zone,
  ZoneCause,
  ZoneReading,
} from "./crew.types.ts";

// illustrative thresholds, NOT clinical guidance; amber reuses THRESHOLDS
export const RISKY_THRESHOLDS = {
  minSpo2Pct: 90,
  maxHeartRateBpm: 120,
  minSleepHours: 4,
  maxDoseMsv: 150,
} as const;

const SEVERITY_RANK: Record<Severity, number> = {
  ok: 0,
  "possible-risk": 1,
  risky: 2,
};

export function signalSeverity(signal: Signal, value: number): Severity {
  switch (signal) {
    case "spo2":
      if (value < RISKY_THRESHOLDS.minSpo2Pct) return "risky";
      return value < THRESHOLDS.minSpo2Pct ? "possible-risk" : "ok";
    case "heartRate":
      if (value > RISKY_THRESHOLDS.maxHeartRateBpm) return "risky";
      return value > THRESHOLDS.maxHeartRateBpm ? "possible-risk" : "ok";
    case "sleep":
      if (value < RISKY_THRESHOLDS.minSleepHours) return "risky";
      return value < THRESHOLDS.minSleepHours ? "possible-risk" : "ok";
    case "dose":
      if (value > RISKY_THRESHOLDS.maxDoseMsv) return "risky";
      return value > THRESHOLDS.maxDoseMsv ? "possible-risk" : "ok";
  }
}

export function worstSeverity(severities: readonly Severity[]): Severity {
  return severities.reduce<Severity>(
    (worst, next) => (SEVERITY_RANK[next] > SEVERITY_RANK[worst] ? next : worst),
    "ok",
  );
}

// illustrative signal -> zone mapping
const ZONES: { zone: Zone; label: string; signals: Signal[] }[] = [
  { zone: "head", label: "Cabeza", signals: ["sleep"] },
  { zone: "thorax", label: "Tórax", signals: ["heartRate", "spo2"] },
  { zone: "abdomen-pelvis", label: "Abdomen y pelvis", signals: ["dose"] },
];

const SIGNAL_META: Record<Signal, { label: string; unit: string }> = {
  spo2: { label: "SpO₂", unit: "%" },
  heartRate: { label: "Frecuencia cardíaca", unit: "lpm" },
  sleep: { label: "Sueño", unit: "h" },
  dose: { label: "Dosis acumulada", unit: "mSv" },
};

// ids come from bodyMapRegions in src/shared/ui/body-map.tsx
export const ZONE_REGION_IDS: Record<Zone, readonly string[]> = {
  head: ["head", "back-of-head"],
  thorax: ["right-chest", "left-chest", "right-upper-back", "left-upper-back"],
  "abdomen-pelvis": [
    "right-upper-abdomen",
    "left-upper-abdomen",
    "right-lower-abdomen",
    "left-lower-abdomen",
    "groin",
    "right-lower-back",
    "left-lower-back",
    "right-buttock",
    "left-buttock",
  ],
};

function signalValue(member: CrewMember, signal: Signal): number {
  switch (signal) {
    case "spo2":
      return member.vitals.spo2Pct;
    case "heartRate":
      return member.vitals.heartRateBpm;
    case "sleep":
      return member.vitals.sleepHours;
    case "dose":
      return member.cumulativeDoseMsv;
  }
}

export function zoneReadings(member: CrewMember): ZoneReading[] {
  return ZONES.map(({ zone, label, signals }) => {
    const all: ZoneCause[] = signals.map((signal) => {
      const value = signalValue(member, signal);
      return {
        signal,
        ...SIGNAL_META[signal],
        value,
        severity: signalSeverity(signal, value),
      };
    });
    return {
      zone,
      label,
      severity: worstSeverity(all.map((cause) => cause.severity)),
      signals: all,
      causes: all.filter((cause) => cause.severity !== "ok"),
    };
  });
}

export function primarySignal(zones: readonly ZoneReading[]): ZoneCause | null {
  let main: ZoneCause | null = null;
  for (const cause of zones.flatMap((zone) => zone.causes)) {
    if (!main || SEVERITY_RANK[cause.severity] > SEVERITY_RANK[main.severity]) main = cause;
  }
  return main;
}

export function regionSeverities(zones: readonly ZoneReading[]): Record<string, Severity> {
  const result: Record<string, Severity> = {};
  for (const { zone, severity } of zones) {
    for (const id of ZONE_REGION_IDS[zone]) result[id] = severity;
  }
  return result;
}
