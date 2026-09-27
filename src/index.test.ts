import { test } from "node:test";
import assert from "node:assert/strict";
import * as dataPlatform from "./index.ts";

test("re-exports the core and catalogue modules", () => {
  assert.equal(typeof dataPlatform.core, "object");
  assert.equal(typeof dataPlatform.catalogue, "object");
});

test("COLLECTION_SCHEMAS merges every Core and Catalogue collection's schema", () => {
  assert.equal(
    dataPlatform.COLLECTION_SCHEMAS[dataPlatform.core.ITEMS_COLLECTION],
    dataPlatform.core.itemSchema,
  );
  assert.equal(
    dataPlatform.COLLECTION_SCHEMAS[dataPlatform.catalogue.SHOPS_COLLECTION],
    dataPlatform.catalogue.shopSchema,
  );
});
