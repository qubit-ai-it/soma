import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { homeKind, selectHomeCrew } from "./roles.home.ts";

const crew = [
  { id: "cm-01", attention: "nominal" as const },
  { id: "cm-02", attention: "watch" as const },
  { id: "cm-03", attention: "review" as const },
  { id: "cm-04", attention: "nominal" as const },
  { id: "cm-05", attention: "review" as const },
];

describe("homeKind", () => {
  it("gives each role its own home", () => {
    assert.equal(homeKind("astronaut"), "self");
    assert.equal(homeKind("cmo"), "review");
    assert.equal(homeKind("commander"), "operational");
    assert.equal(homeKind("earth"), "earth");
  });
});

describe("selectHomeCrew", () => {
  it("shows the astronaut only their own member", () => {
    assert.deepEqual(
      selectHomeCrew("astronaut", crew, "cm-02").map((m) => m.id),
      ["cm-02"],
    );
  });

  it("shows nothing to the astronaut when their member is not in the list", () => {
    assert.deepEqual(selectHomeCrew("astronaut", crew, "cm-99"), []);
  });

  it("shows the whole crew to the medical officer, review first and then watch", () => {
    assert.deepEqual(
      selectHomeCrew("cmo", crew, "cm-02").map((m) => m.id),
      ["cm-03", "cm-05", "cm-02", "cm-01", "cm-04"],
    );
  });

  it("shows no clinical cards to the commander or to Earth", () => {
    assert.deepEqual(selectHomeCrew("commander", crew, "cm-02"), []);
    assert.deepEqual(selectHomeCrew("earth", crew, "cm-02"), []);
  });

  it("does not change the list it receives", () => {
    const snapshot = JSON.stringify(crew);
    selectHomeCrew("cmo", crew, "cm-02");
    assert.equal(JSON.stringify(crew), snapshot);
  });
});
