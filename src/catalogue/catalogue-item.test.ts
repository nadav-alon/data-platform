import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGUE_ITEMS_COLLECTION, catalogueItemSchema } from "./catalogue-item.ts";

test("accepts a CatalogueItem with only the required fields", () => {
  const catalogueItem = catalogueItemSchema.parse({
    categoryId: "medicine",
    necessity: "essential",
  });
  assert.equal(catalogueItem.categoryId, "medicine");
  assert.equal(catalogueItem.necessity, "essential");
  assert.equal(catalogueItem.shopId, undefined);
});

test("accepts a CatalogueItem with a shopId override", () => {
  const catalogueItem = catalogueItemSchema.parse({
    categoryId: "medicine",
    necessity: "essential",
    shopId: "grocery",
  });
  assert.equal(catalogueItem.shopId, "grocery");
});

test("tolerates an unknown field", () => {
  const catalogueItem = catalogueItemSchema.parse({
    categoryId: "medicine",
    necessity: "essential",
    unexpected: true,
  });
  assert.equal(catalogueItem.unexpected, true);
});

test("rejects a missing categoryId", () => {
  assert.throws(() => catalogueItemSchema.parse({ necessity: "essential" }));
});

test("rejects an empty categoryId", () => {
  assert.throws(() =>
    catalogueItemSchema.parse({ categoryId: "", necessity: "essential" }),
  );
});

test("rejects a missing necessity", () => {
  assert.throws(() => catalogueItemSchema.parse({ categoryId: "medicine" }));
});

test("rejects a necessity outside the Necessity enum", () => {
  assert.throws(() =>
    catalogueItemSchema.parse({ categoryId: "medicine", necessity: "nice to have" }),
  );
});

test("rejects an empty shopId override", () => {
  assert.throws(() =>
    catalogueItemSchema.parse({ categoryId: "medicine", necessity: "essential", shopId: "" }),
  );
});

test("CATALOGUE_ITEMS_COLLECTION is stable", () => {
  assert.equal(CATALOGUE_ITEMS_COLLECTION, "catalogueItems");
});
