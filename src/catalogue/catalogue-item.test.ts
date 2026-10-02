import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATALOGUE_ITEMS_COLLECTION,
  catalogueItemDocPath,
  catalogueItemSchema,
} from "./catalogue-item.ts";
import { itemId } from "../core/index.ts";
import { categoryId } from "./category.ts";

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

test("catalogueItemDocPath keys the doc by its ItemId", () => {
  assert.equal(catalogueItemDocPath(itemId("dish-soap")), "catalogueItems/dish-soap");
});

test("catalogueItemDocPath rejects a bare string", () => {
  // @ts-expect-error a bare string isn't an ItemId
  catalogueItemDocPath("dish-soap");
});

test("catalogueItemDocPath rejects a CategoryId", () => {
  // @ts-expect-error a CategoryId isn't an ItemId
  catalogueItemDocPath(categoryId("medicine"));
});

test("accepts a CatalogueItem soft-deleted with a deletedAt timestamp", () => {
  const catalogueItem = catalogueItemSchema.parse({
    categoryId: "cleaning",
    necessity: "essential",
    deletedAt: { seconds: 1_700_000_000, nanoseconds: 0 },
  });
  assert.equal(catalogueItem.deletedAt?.seconds, 1_700_000_000);
});

test("rejects a non-timestamp deletedAt", () => {
  assert.throws(() =>
    catalogueItemSchema.parse({ categoryId: "cleaning", necessity: "essential", deletedAt: "now" }),
  );
});

test("defaults tagIds to empty when a CatalogueItem has none", () => {
  const catalogueItem = catalogueItemSchema.parse({
    categoryId: "medicine",
    necessity: "essential",
  });
  assert.deepEqual(catalogueItem.tagIds, []);
});

test("accepts any number of tagIds", () => {
  const tagIds = ["glutenFree", "vegan", "bulk"];
  const catalogueItem = catalogueItemSchema.parse({
    categoryId: "medicine",
    necessity: "essential",
    tagIds,
  });
  assert.deepEqual(catalogueItem.tagIds, tagIds);
});

test("rejects an empty tag id", () => {
  assert.throws(() =>
    catalogueItemSchema.parse({ categoryId: "medicine", necessity: "essential", tagIds: [""] }),
  );
});

test("rejects tagIds that is not a list", () => {
  assert.throws(() =>
    catalogueItemSchema.parse({ categoryId: "medicine", necessity: "essential", tagIds: "vegan" }),
  );
});
