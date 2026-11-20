import { test } from "node:test";
import assert from "node:assert/strict";
import * as dataPlatform from "./index.ts";

test("re-exports the core, catalogue and recipes modules", () => {
  assert.equal(typeof dataPlatform.core, "object");
  assert.equal(typeof dataPlatform.catalogue, "object");
  assert.equal(typeof dataPlatform.recipes, "object");
});

test("COLLECTION_SCHEMAS merges every Core, Catalogue and Recipes collection's schema", () => {
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
});

test("COLLECTION_SCHEMAS has no key collision between Core, Catalogue and Recipes", () => {
  const coreKeys = Object.keys(dataPlatform.core.CORE_COLLECTION_SCHEMAS);
  const catalogueKeys = Object.keys(dataPlatform.catalogue.CATALOGUE_COLLECTION_SCHEMAS);
  const recipesKeys = Object.keys(dataPlatform.recipes.RECIPES_COLLECTION_SCHEMAS);

  assert.equal(
    Object.keys(dataPlatform.COLLECTION_SCHEMAS).length,
    coreKeys.length + catalogueKeys.length + recipesKeys.length,
  );
});
