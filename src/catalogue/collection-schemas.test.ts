import { test } from "node:test";
import assert from "node:assert/strict";
import { AISLE_NAMES_COLLECTION, AISLES_COLLECTION, aisleNameReservationSchema, aisleSchema } from "./aisle.ts";
import { CATALOGUE_ITEMS_COLLECTION, catalogueItemSchema } from "./catalogue-item.ts";
import { CATEGORIES_COLLECTION, categorySchema } from "./category.ts";
import { CATALOGUE_COLLECTION_SCHEMAS } from "./collection-schemas.ts";
import { SHOPS_COLLECTION, shopSchema } from "./shop.ts";
import { STORES_COLLECTION, storeSchema } from "./store.ts";
import { TAG_NAMES_COLLECTION, TAGS_COLLECTION, tagNameReservationSchema, tagSchema } from "./tag.ts";

test("keys each Catalogue collection's schema by its own collection name", () => {
  assert.equal(CATALOGUE_COLLECTION_SCHEMAS[CATALOGUE_ITEMS_COLLECTION], catalogueItemSchema);
  assert.equal(CATALOGUE_COLLECTION_SCHEMAS[CATEGORIES_COLLECTION], categorySchema);
  assert.equal(CATALOGUE_COLLECTION_SCHEMAS[SHOPS_COLLECTION], shopSchema);
  assert.equal(CATALOGUE_COLLECTION_SCHEMAS[TAGS_COLLECTION], tagSchema);
  assert.equal(CATALOGUE_COLLECTION_SCHEMAS[TAG_NAMES_COLLECTION], tagNameReservationSchema);
  assert.equal(CATALOGUE_COLLECTION_SCHEMAS[AISLES_COLLECTION], aisleSchema);
  assert.equal(CATALOGUE_COLLECTION_SCHEMAS[AISLE_NAMES_COLLECTION], aisleNameReservationSchema);
  assert.equal(CATALOGUE_COLLECTION_SCHEMAS[STORES_COLLECTION], storeSchema);
});
