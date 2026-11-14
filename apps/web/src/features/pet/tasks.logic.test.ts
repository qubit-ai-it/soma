import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  captureValue,
  createTask,
  isDue,
  markRan,
  MAX_RUNS,
  nextRunAt,
  parseRuns,
  parseTasks,
  recordRun,
  runTask,
} from "./tasks.logic.ts";

const MIN = 60_000;

describe("createTask", () => {
  it("falls back to the capture label when the name is blank", () => {
    const task = createTask("t", 0, { name: "  ", kind: "spo2", intervalMinutes: 5 });
    assert.equal(task.name, "Saturación de oxígeno");
    assert.equal(task.enabled, true);
  });

  it("never schedules faster than every minute", () => {
    assert.equal(createTask("t", 0, { name: "x", kind: "spo2", intervalMinutes: 0 }).intervalMinutes, 1);
  });
});

describe("isDue", () => {
  const task = createTask("t", 1000, { name: "x", kind: "heart_rate", intervalMinutes: 5 });

  it("is due once the interval elapsed since creation", () => {
    assert.equal(isDue(task, 1000 + 5 * MIN - 1), false);
    assert.equal(isDue(task, 1000 + 5 * MIN), true);
  });

  it("counts from the last run and ignores disabled tasks", () => {
    const ran = markRan([task], "t", 10 * MIN)[0];
    assert.equal(nextRunAt(ran), 15 * MIN);
    assert.equal(isDue({ ...ran, enabled: false }, 99 * MIN), false);
  });
});

describe("captures", () => {
  it("keeps values inside the kind range and marks them synthetic", () => {
    assert.equal(captureValue("spo2", 0), 94);
    assert.equal(captureValue("spo2", 1), 99);
    assert.equal(captureValue("spo2", 5), 99);
    const task = createTask("t", 0, { name: "x", kind: "heart_rate", intervalMinutes: 1 });
    const run = runTask(task, "r", 5, 0.5);
    assert.equal(run.synthetic, true);
    assert.equal(run.unit, "lpm");
  });

  it("caps the run log, newest first", () => {
    const task = createTask("t", 0, { name: "x", kind: "heart_rate", intervalMinutes: 1 });
    let runs = [] as ReturnType<typeof recordRun>;
    for (let i = 0; i < MAX_RUNS + 3; i++) runs = recordRun(runs, runTask(task, String(i), i, 0.5));
    assert.equal(runs.length, MAX_RUNS);
    assert.equal(runs[0].id, String(MAX_RUNS + 2));
  });
});

describe("parsers", () => {
  it("drop malformed entries", () => {
    assert.deepEqual(parseTasks([{ id: "x" }, 3]), []);
    assert.deepEqual(parseRuns("nope"), []);
  });
});
