import { test } from "node:test";
import assert from "node:assert/strict";
import { NUTRITION_TARGETS_COLLECTION, TARGET_FIELDS, targetsSchema } from "./targets.ts";
import { NUTRITION_COLLECTION_SCHEMAS } from "./collection-schemas.ts";

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

test("keys the Targets schema by its collection name", () => {
  assert.equal(NUTRITION_COLLECTION_SCHEMAS[NUTRITION_TARGETS_COLLECTION], targetsSchema);
});
