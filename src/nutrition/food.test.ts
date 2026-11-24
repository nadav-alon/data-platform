import { test } from "node:test";
import assert from "node:assert/strict";
import { FOODS_COLLECTION, foodId, foodIdSchema, foodSchema, isFoodId } from "./food.ts";
import { nutritionSchema } from "./nutrition.ts";

const perServing = { kcal: 650, proteinG: 30, carbsG: 70, fatG: 25 };

const valid = {
  name: "Chicken schnitzel plate",
  place: "work canteen",
  perServing,
  servingLabel: "1 plate",
  estimated: true,
};

test("names its collection foods", () => {
  assert.equal(FOODS_COLLECTION, "foods");
});

test("accepts a Food with every field", () => {
  assert.ok(foodSchema.safeParse(valid).success);
});

test("accepts a Food with only a name and perServing", () => {
  assert.ok(foodSchema.safeParse({ name: "Apple", perServing }).success);
});

test("rejects an empty name", () => {
  assert.ok(!foodSchema.safeParse({ ...valid, name: "" }).success);
});

test("rejects a Food without perServing", () => {
  const { perServing: _omitted, ...rest } = valid;
  assert.ok(!foodSchema.safeParse(rest).success);
});

test("rejects a perServing missing a macro", () => {
  const { fatG: _omitted, ...partial } = perServing;
  assert.ok(!foodSchema.safeParse({ ...valid, perServing: partial }).success);
});

test("rejects a negative macro", () => {
  for (const key of Object.keys(perServing)) {
    assert.ok(!nutritionSchema.safeParse({ ...perServing, [key]: -1 }).success, key);
  }
});

test("accepts zero macros", () => {
  assert.ok(nutritionSchema.safeParse({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }).success);
});

test("rejects estimated: false", () => {
  assert.ok(!foodSchema.safeParse({ ...valid, estimated: false }).success);
});

test("accepts a soft-deleted Food", () => {
  assert.ok(foodSchema.safeParse({ ...valid, deletedAt: { seconds: 1, nanoseconds: 0 } }).success);
});

test("FoodId rejects an empty string and its constructor throws", () => {
  assert.equal(isFoodId(""), false);
  assert.equal(isFoodId("schnitzel"), true);
  assert.throws(() => foodId(""), /FoodId/);
  assert.equal(foodId("schnitzel"), "schnitzel");
  assert.ok(!foodIdSchema.safeParse("").success);
});
