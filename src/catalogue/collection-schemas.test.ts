import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGUE_ITEMS_COLLECTION, catalogueItemSchema } from "./catalogue-item.ts";
import { CATEGORIES_COLLECTION, categorySchema } from "./category.ts";
import { CATALOGUE_COLLECTION_SCHEMAS } from "./collection-schemas.ts";
import { SHOPS_COLLECTION, shopSchema } from "./shop.ts";

test("keys each Catalogue collection's schema by its own collection name", () => {
  assert.equal(CATALOGUE_COLLECTION_SCHEMAS[CATALOGUE_ITEMS_COLLECTION], catalogueItemSchema);
  assert.equal(CATALOGUE_COLLECTION_SCHEMAS[CATEGORIES_COLLECTION], categorySchema);
  assert.equal(CATALOGUE_COLLECTION_SCHEMAS[SHOPS_COLLECTION], shopSchema);
});
