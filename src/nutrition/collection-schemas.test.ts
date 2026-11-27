import { test } from "node:test";
import assert from "node:assert/strict";
import { NUTRITION_TARGETS_COLLECTION, TARGET_FIELDS, targetsSchema } from "./targets.ts";
import { NUTRITION_COLLECTION_SCHEMAS } from "./collection-schemas.ts";
import { NUTRITION_SETTINGS_COLLECTION, nutritionSettingsSchema } from "./settings.ts";
import { FOODS_COLLECTION, foodSchema } from "./food.ts";

test("Targets accept an empty document and any subset of the four", () => {
  assert.equal(targetsSchema.safeParse({}).success, true);
  assert.equal(targetsSchema.safeParse({ kcal: 2000, proteinG: 120.5 }).success, true);
  assert.equal(
    targetsSchema.safeParse({ kcal: 2000, proteinG: 120, carbsG: 250, fatG: 70 }).success,
    true,
  );
});

test("Targets reject zero, negative and non-numeric values", () => {
  for (const field of TARGET_FIELDS) {
    for (const value of [0, -1, Infinity, "100", null]) {
      assert.equal(targetsSchema.safeParse({ [field]: value }).success, false, `${field}=${value}`);
    }
  }
});

test("Targets accept the largest finite number", () => {
  for (const field of TARGET_FIELDS) {
    assert.equal(targetsSchema.safeParse({ [field]: Number.MAX_VALUE }).success, true, field);
  }
});

test("keys the Targets schema by its collection name", () => {
  assert.equal(NUTRITION_COLLECTION_SCHEMAS[NUTRITION_TARGETS_COLLECTION], targetsSchema);
});

test("keys the Food schema by its collection name", () => {
  assert.equal(NUTRITION_COLLECTION_SCHEMAS[FOODS_COLLECTION], foodSchema);
});

test("keys the Nutrition Settings schema by its collection name", () => {
  assert.equal(NUTRITION_COLLECTION_SCHEMAS[NUTRITION_SETTINGS_COLLECTION], nutritionSettingsSchema);
});

test("Nutrition Settings accept an empty document and googleHealthSync true", () => {
  assert.equal(nutritionSettingsSchema.safeParse({}).success, true);
  assert.equal(nutritionSettingsSchema.safeParse({ googleHealthSync: true }).success, true);
});

test("Nutrition Settings reject googleHealthSync false, non-booleans and unknown fields", () => {
  for (const data of [{ googleHealthSync: false }, { googleHealthSync: "true" }, { other: 1 }]) {
    assert.equal(nutritionSettingsSchema.safeParse(data).success, false, JSON.stringify(data));
  }
});
