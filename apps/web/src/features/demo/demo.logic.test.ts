import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { keyToAction, nextIndex, prevIndex, totalSeconds } from "./demo.logic.ts";
import { DEMO_STEPS } from "./demo.script.ts";

const appDir = fileURLToPath(new URL("../../app", import.meta.url));

function pagePatterns(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      const segment = name.startsWith("(") ? "" : `/${name}`;
      out.push(...pagePatterns(full, prefix + segment));
    } else if (name === "page.tsx") {
      out.push(prefix === "" ? "/" : prefix);
    }
  }
  return out;
}

function matches(pattern: string, href: string): boolean {
  const a = pattern.split("/");
  const b = href.split("/");
  return a.length === b.length && a.every((seg, i) => seg.startsWith("[") || seg === b[i]);
}

describe("demo script", () => {
  it("has unique step ids and positive durations", () => {
    assert.equal(new Set(DEMO_STEPS.map((s) => s.id)).size, DEMO_STEPS.length);
    assert.ok(DEMO_STEPS.every((s) => s.durationSec > 0));
  });

  it("gives every step copy for the screen, the speaker and the principle", () => {
    for (const step of DEMO_STEPS) {
      assert.ok(step.title && step.onScreen && step.say && step.principle);
    }
  });

  it("points every step to a page that exists", () => {
    const patterns = pagePatterns(appDir);
    for (const step of DEMO_STEPS) {
      const path = step.href.split("?")[0];
      assert.ok(
        patterns.some((p) => matches(p, path)),
        `no page for ${step.href}`,
      );
    }
  });

  it("totals the step durations", () => {
    assert.equal(
      totalSeconds(DEMO_STEPS),
      DEMO_STEPS.reduce((sum, s) => sum + s.durationSec, 0),
    );
  });
});

describe("demo navigation", () => {
  it("clamps next and previous inside the script", () => {
    assert.equal(nextIndex(0, 5), 1);
    assert.equal(nextIndex(4, 5), 4);
    assert.equal(prevIndex(3), 2);
    assert.equal(prevIndex(0), 0);
  });

  it("maps keys to actions", () => {
    assert.equal(keyToAction("ArrowRight"), "next");
    assert.equal(keyToAction(" "), "next");
    assert.equal(keyToAction("ArrowLeft"), "prev");
    assert.equal(keyToAction("r"), "restart");
    assert.equal(keyToAction("R"), "restart");
    assert.equal(keyToAction("Home"), "restart");
    assert.equal(keyToAction("x"), null);
  });
});
