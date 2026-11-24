import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LOG_ENTRIES_COLLECTION,
  NUTRITION_LOGS_COLLECTION,
  isLogEntryId,
  logEntryId,
  logEntryIdSchema,
  logEntrySchema,
} from "./log-entry.ts";
import { NUTRITION_COLLECTION_SCHEMAS } from "./collection-schemas.ts";
import { foodId } from "./food.ts";

const nutrition = { kcal: 975, proteinG: 45, carbsG: 105, fatG: 37.5 };
const eatenAt = { seconds: 1_700_000_000, nanoseconds: 0 };

const food = {
  eatenAt,
  mealType: "lunch",
  source: { kind: "food", foodId: foodId("schnitzel") },
  name: "Schnitzel plate",
  servings: 1.5,
  nutrition,
};
const quick = { ...food, source: { kind: "quick" }, mealType: "snack", servings: 1 };

test("a food entry and a quick entry are valid", () => {
  assert.ok(logEntrySchema.safeParse(food).success);
  assert.ok(logEntrySchema.safeParse(quick).success);
});

test("eatenAt accepts a Date", () => {
  assert.ok(logEntrySchema.safeParse({ ...food, eatenAt: new Date() }).success);
});

test("servings must be positive", () => {
  for (const servings of [0, -1, Infinity, "1"]) {
    assert.ok(!logEntrySchema.safeParse({ ...food, servings }).success, String(servings));
  }
});

test("mealType is one of the four", () => {
  for (const mealType of ["breakfast", "lunch", "dinner", "snack"]) {
    assert.ok(logEntrySchema.safeParse({ ...food, mealType }).success, mealType);
  }
  assert.ok(!logEntrySchema.safeParse({ ...food, mealType: "brunch" }).success);
});

test("a food source needs a foodId; an unknown kind is rejected", () => {
  assert.ok(!logEntrySchema.safeParse({ ...food, source: { kind: "food" } }).success);
  assert.ok(!logEntrySchema.safeParse({ ...food, source: { kind: "food", foodId: "" } }).success);
  assert.ok(!logEntrySchema.safeParse({ ...food, source: { kind: "recipe" } }).success);
});

test("name must be non-empty and nutrition complete", () => {
  assert.ok(!logEntrySchema.safeParse({ ...food, name: "" }).success);
  assert.ok(!logEntrySchema.safeParse({ ...food, nutrition: { kcal: 1 } }).success);
});

test("googleHealthId and deletedAt are optional", () => {
  assert.ok(logEntrySchema.safeParse({ ...food, googleHealthId: "gh-1", deletedAt: eatenAt }).success);
  assert.ok(!logEntrySchema.safeParse({ ...food, googleHealthId: "" }).success);
});

test("LogEntryId rejects the empty string", () => {
  assert.equal(isLogEntryId(""), false);
  assert.equal(logEntryId("a"), "a");
  assert.throws(() => logEntryId(""), /LogEntryId/);
  assert.ok(!logEntryIdSchema.safeParse("").success);
});

test("the module's collection schemas hold Log Entries under a Member's log", () => {
  assert.equal(
    NUTRITION_COLLECTION_SCHEMAS[`${NUTRITION_LOGS_COLLECTION}/*/${LOG_ENTRIES_COLLECTION}`],
    logEntrySchema,
  );
});
