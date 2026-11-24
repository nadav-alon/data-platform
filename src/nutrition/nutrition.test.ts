import { test } from "node:test";
import assert from "node:assert/strict";
import { grams, kcal, scaleNutrition } from "./nutrition.ts";

test("scaleNutrition multiplies every field by the servings", () => {
  const perServing = { kcal: kcal(720), proteinG: grams(38), carbsG: grams(64), fatG: grams(33) };
  assert.deepEqual(scaleNutrition(perServing, 1.5), { kcal: 1080, proteinG: 57, carbsG: 96, fatG: 49.5 });
});
