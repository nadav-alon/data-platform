import { test } from "node:test";
import assert from "node:assert/strict";
import { RECIPES_COLLECTION_SCHEMAS } from "./collection-schemas.ts";
import { RECIPES_COLLECTION, recipeSchema } from "./recipe.ts";

test("keys the Recipe schema by its collection name", () => {
  assert.equal(RECIPES_COLLECTION_SCHEMAS[RECIPES_COLLECTION], recipeSchema);
});
