import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { flagCards } from "./crew.flags.ts";

const vitals = { heartRateBpm: 112, spo2Pct: 92, sleepHours: 5.4 };

describe("flagCards", () => {
  it("pairs each flag with the reading that raised it and its limit", () => {
    const cards = flagCards({
      vitals,
      cumulativeDoseMsv: 130,
      flags: [
        { code: "short-sleep", label: "Sueño insuficiente" },
        { code: "low-spo2", label: "SpO₂ baja" },
        { code: "high-heart-rate", label: "Frecuencia cardíaca alta" },
        { code: "high-dose", label: "Dosis alta" },
      ],
    });
    const by = Object.fromEntries(cards.map((card) => [card.code, card]));
    assert.deepEqual([by["short-sleep"].value, by["short-sleep"].line], ["5,4 h", "Mínimo 6 h"]);
    assert.deepEqual([by["low-spo2"].value, by["low-spo2"].line], ["92 %", "Mínimo 94 %"]);
    assert.deepEqual([by["high-heart-rate"].value, by["high-heart-rate"].line], ["112 lpm", "Máximo 100 lpm"]);
    assert.deepEqual([by["high-dose"].value, by["high-dose"].line], ["130 mSv", "Máximo 100 mSv"]);
  });

  it("keeps the flag's own label and rates sleep as a watch, not an alarm", () => {
    const [card] = flagCards({
      vitals,
      cumulativeDoseMsv: 0,
      flags: [{ code: "short-sleep", label: "Sueño insuficiente" }],
    });
    assert.equal(card.title, "Sueño insuficiente");
    assert.equal(card.tone, "warn");
  });

  it("returns nothing when there are no flags", () => {
    assert.deepEqual(flagCards({ vitals, cumulativeDoseMsv: 0, flags: [] }), []);
  });
});
