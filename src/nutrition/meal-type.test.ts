import { test } from "node:test";
import assert from "node:assert/strict";
import { guessMealType, guessMealTypeAtClock } from "./meal-type.ts";

const at = (hours: number, minutes: number) => new Date(2026, 10, 24, hours, minutes);

test("a Log Entry eaten before 11:00 is breakfast, before 16:00 lunch, after 21:30 a snack, else dinner", () => {
  assert.equal(guessMealType(at(0, 0)), "breakfast");
  assert.equal(guessMealType(at(10, 59)), "breakfast");
  assert.equal(guessMealType(at(11, 0)), "lunch");
  assert.equal(guessMealType(at(15, 59)), "lunch");
  assert.equal(guessMealType(at(16, 0)), "dinner");
  assert.equal(guessMealType(at(20, 31)), "dinner");
  assert.equal(guessMealType(at(21, 30)), "dinner");
  assert.equal(guessMealType(at(21, 31)), "snack");
  assert.equal(guessMealType(at(23, 59)), "snack");
});

test("guessMealTypeAtClock reads a wall-clock time without a timezone", () => {
  assert.equal(guessMealTypeAtClock(8, 0), "breakfast");
  assert.equal(guessMealTypeAtClock(23, 0), "snack");
});
