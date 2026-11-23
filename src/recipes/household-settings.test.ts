import { test } from "node:test";
import assert from "node:assert/strict";
import { HOUSEHOLD_SETTINGS_DOC_PATH, householdSettingsSchema } from "./household-settings.ts";
import { RECIPES_COLLECTION_SCHEMAS } from "./collection-schemas.ts";

test("settings with no Shop for Recipe Ingredients are valid: absent means unset", () => {
  assert.equal(householdSettingsSchema.safeParse({}).success, true);
});

test("settings accept a Shop id as the Shop for Recipe Ingredients", () => {
  const parsed = householdSettingsSchema.safeParse({ recipeIngredientShopId: "grocery" });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data?.recipeIngredientShopId, "grocery");
});

test("settings refuse an empty or non-string Shop id", () => {
  assert.equal(householdSettingsSchema.safeParse({ recipeIngredientShopId: "" }).success, false);
  assert.equal(householdSettingsSchema.safeParse({ recipeIngredientShopId: 3 }).success, false);
});

test("keys the settings schema by its doc path", () => {
  assert.equal(RECIPES_COLLECTION_SCHEMAS[HOUSEHOLD_SETTINGS_DOC_PATH], householdSettingsSchema);
});
