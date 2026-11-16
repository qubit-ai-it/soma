import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TOUR_STEPS, advanceWhileDone, placeCard, type TourContext } from "./tour.logic.ts";

const idle: TourContext = { crewCount: 2, profileOpen: false, lowPulse: false, emergency: false };
const index = (id: string) => TOUR_STEPS.findIndex((step) => step.id === id);

describe("tour steps", () => {
  it("follow the demo script and have unique ids", () => {
    assert.deepEqual(
      TOUR_STEPS.map((step) => step.id),
      ["crew", "profile", "pulse", "evaluation", "notifications", "experience", "report"],
    );
    assert.equal(new Set(TOUR_STEPS.map((step) => step.id)).size, TOUR_STEPS.length);
  });

  it("tells a lone user that a second person is needed", () => {
    assert.match(TOUR_STEPS[0].text({ ...idle, crewCount: 1 }), /at least two/);
    assert.doesNotMatch(TOUR_STEPS[0].text(idle), /at least two/);
  });

  it("names the 20 bpm threshold in the emergency step", () => {
    assert.match(TOUR_STEPS[index("pulse")].text(idle), /20 bpm/);
  });
});

describe("advanceWhileDone", () => {
  it("stays on steps that wait for the user and on manual steps", () => {
    assert.equal(advanceWhileDone(index("profile"), idle), index("profile"));
    assert.equal(advanceWhileDone(index("crew"), idle), index("crew"));
    assert.equal(advanceWhileDone(index("notifications"), { ...idle, emergency: true }), index("notifications"));
  });

  it("moves on when the user performs the action", () => {
    assert.equal(advanceWhileDone(index("profile"), { ...idle, profileOpen: true }), index("pulse"));
    assert.equal(
      advanceWhileDone(index("pulse"), { ...idle, profileOpen: true, lowPulse: true }),
      index("evaluation"),
    );
  });

  it("chains through steps that are already done and stops at the next manual one", () => {
    const done: TourContext = { crewCount: 2, profileOpen: true, lowPulse: true, emergency: true };
    assert.equal(advanceWhileDone(index("profile"), done), index("notifications"));
  });

  it("never runs past the last step", () => {
    assert.equal(advanceWhileDone(TOUR_STEPS.length - 1, { crewCount: 2, profileOpen: true, lowPulse: true, emergency: true }), TOUR_STEPS.length - 1);
  });
});

describe("placeCard", () => {
  const viewport = { width: 1000, height: 700 };
  const card = { width: 320, height: 180 };

  it("puts the card below the target when there is room", () => {
    const placed = placeCard({ top: 100, left: 400, width: 100, height: 40 }, viewport, card);
    assert.equal(placed.top, 152);
    assert.equal(placed.left, 290);
  });

  it("flips above the target near the bottom edge", () => {
    const placed = placeCard({ top: 600, left: 400, width: 100, height: 40 }, viewport, card);
    assert.equal(placed.top, 600 - 12 - card.height);
  });

  it("keeps the card inside the viewport horizontally", () => {
    assert.equal(placeCard({ top: 100, left: 0, width: 20, height: 20 }, viewport, card).left, 12);
    assert.equal(placeCard({ top: 100, left: 990, width: 10, height: 20 }, viewport, card).left, 1000 - 320 - 12);
  });

  it("centers the card when the target is missing", () => {
    const placed = placeCard(null, viewport, card);
    assert.equal(placed.left, 340);
    assert.equal(placed.top, 260);
  });
});
