import { test } from "node:test";
import assert from "node:assert/strict";
import * as dataPlatform from "./index.ts";

test("re-exports the core, catalogue, recipes and nutrition modules", () => {
  assert.equal(typeof dataPlatform.core, "object");
  assert.equal(typeof dataPlatform.catalogue, "object");
  assert.equal(typeof dataPlatform.recipes, "object");
  assert.equal(typeof dataPlatform.nutrition, "object");
});

test("COLLECTION_SCHEMAS merges every Core, Catalogue, Recipes and Nutrition collection's schema", () => {
  assert.equal(
    dataPlatform.COLLECTION_SCHEMAS[dataPlatform.core.ITEMS_COLLECTION],
    dataPlatform.core.itemSchema,
  );
  assert.equal(
    dataPlatform.COLLECTION_SCHEMAS[dataPlatform.catalogue.SHOPS_COLLECTION],
    dataPlatform.catalogue.shopSchema,
  );
  assert.equal(
    dataPlatform.COLLECTION_SCHEMAS[dataPlatform.recipes.RECIPES_COLLECTION],
    dataPlatform.recipes.recipeSchema,
  );
  assert.equal(
    dataPlatform.COLLECTION_SCHEMAS[dataPlatform.nutrition.NUTRITION_TARGETS_COLLECTION],
    dataPlatform.nutrition.targetsSchema,
  );
  assert.equal(
    dataPlatform.COLLECTION_SCHEMAS[dataPlatform.nutrition.FOODS_COLLECTION],
    dataPlatform.nutrition.foodSchema,
  );
  assert.equal(
    dataPlatform.COLLECTION_SCHEMAS[
      `${dataPlatform.nutrition.NUTRITION_LOGS_COLLECTION}/*/${dataPlatform.nutrition.LOG_ENTRIES_COLLECTION}`
    ],
    dataPlatform.nutrition.logEntrySchema,
  );
});

test("COLLECTION_SCHEMAS has no key collision between Core, Catalogue, Recipes and Nutrition", () => {
  const coreKeys = Object.keys(dataPlatform.core.CORE_COLLECTION_SCHEMAS);
  const catalogueKeys = Object.keys(dataPlatform.catalogue.CATALOGUE_COLLECTION_SCHEMAS);
  const recipesKeys = Object.keys(dataPlatform.recipes.RECIPES_COLLECTION_SCHEMAS);
  const nutritionKeys = Object.keys(dataPlatform.nutrition.NUTRITION_COLLECTION_SCHEMAS);

  assert.equal(
    Object.keys(dataPlatform.COLLECTION_SCHEMAS).length,
    coreKeys.length + catalogueKeys.length + recipesKeys.length + nutritionKeys.length,
  );
});
