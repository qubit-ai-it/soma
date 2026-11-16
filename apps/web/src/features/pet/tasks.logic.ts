export const CAPTURE_KINDS = [
  { id: "heart_rate", label: "Heart rate", unit: "bpm", min: 58, max: 96 },
  { id: "spo2", label: "Oxygen saturation", unit: "%", min: 94, max: 99 },
  { id: "temperature", label: "Body temperature", unit: "°C", min: 36.1, max: 37.4 },
  { id: "stress", label: "Stress level", unit: "/100", min: 12, max: 68 },
  { id: "cabin", label: "Cabin environment", unit: "ppm CO₂", min: 400, max: 900 },
] as const;

export type CaptureKind = (typeof CAPTURE_KINDS)[number]["id"];

export const INTERVAL_OPTIONS = [1, 5, 15, 30, 60] as const;

export type ScheduledTask = {
  id: string;
  name: string;
  kind: CaptureKind;
  intervalMinutes: number;
  enabled: boolean;
  createdAt: number;
  lastRunAt?: number;
};

export type TaskRun = {
  id: string;
  taskId: string;
  taskName: string;
  kind: CaptureKind;
  value: number;
  unit: string;
  at: number;
  synthetic: true;
};

export const MAX_RUNS = 50;

export function kindInfo(kind: CaptureKind) {
  return CAPTURE_KINDS.find((k) => k.id === kind) ?? CAPTURE_KINDS[0];
}

export function createTask(
  id: string,
  now: number,
  input: { name: string; kind: CaptureKind; intervalMinutes: number },
): ScheduledTask {
  const name = input.name.trim() || kindInfo(input.kind).label;
  return {
    id,
    name,
    kind: input.kind,
    intervalMinutes: Math.max(1, Math.round(input.intervalMinutes)),
    enabled: true,
    createdAt: now,
  };
}

export function nextRunAt(task: ScheduledTask): number {
  return (task.lastRunAt ?? task.createdAt) + task.intervalMinutes * 60_000;
}

export function isDue(task: ScheduledTask, now: number): boolean {
  return task.enabled && now >= nextRunAt(task);
}

export function captureValue(kind: CaptureKind, random: number): number {
  const { min, max } = kindInfo(kind);
  const raw = min + (max - min) * Math.min(1, Math.max(0, random));
  return Math.round(raw * 10) / 10;
}

export function runTask(task: ScheduledTask, runId: string, now: number, random: number): TaskRun {
  const info = kindInfo(task.kind);
  return {
    id: runId,
    taskId: task.id,
    taskName: task.name,
    kind: task.kind,
    value: captureValue(task.kind, random),
    unit: info.unit,
    at: now,
    synthetic: true,
  };
}

export function recordRun(runs: TaskRun[], run: TaskRun): TaskRun[] {
  return [run, ...runs].slice(0, MAX_RUNS);
}

export function markRan(tasks: ScheduledTask[], taskId: string, now: number): ScheduledTask[] {
  return tasks.map((t) => (t.id === taskId ? { ...t, lastRunAt: now } : t));
}

export function parseTasks(value: unknown): ScheduledTask[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (t): t is ScheduledTask =>
      typeof t === "object" &&
      t !== null &&
      typeof t.id === "string" &&
      typeof t.name === "string" &&
      typeof t.intervalMinutes === "number" &&
      typeof t.enabled === "boolean" &&
      typeof t.createdAt === "number" &&
      CAPTURE_KINDS.some((k) => k.id === t.kind),
  );
}

export function parseRuns(value: unknown): TaskRun[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (r): r is TaskRun =>
      typeof r === "object" &&
      r !== null &&
      typeof r.id === "string" &&
      typeof r.taskId === "string" &&
      typeof r.value === "number" &&
      typeof r.at === "number",
  );
}
