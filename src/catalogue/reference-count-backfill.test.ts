import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryId } from "./category.ts";
import { computeReferenceCounts } from "./reference-count-backfill.ts";
import { shopId } from "./shop.ts";

test("a Shop or Category with nothing referencing it backfills to 0", () => {
  const result = computeReferenceCounts({
    shopIds: [shopId("pharmacy")],
    categories: new Map([[categoryId("medicine"), { defaultShopId: shopId("grocery") }]]),
    catalogueItems: [],
  });
  assert.equal(result.shops.get(shopId("pharmacy")), 0);
  assert.equal(result.categories.get(categoryId("medicine")), 0);
});

test("a Category's defaultShopId counts toward that Shop", () => {
  const result = computeReferenceCounts({
    shopIds: [shopId("pharmacy")],
    categories: new Map([[categoryId("medicine"), { defaultShopId: shopId("pharmacy") }]]),
    catalogueItems: [],
  });
  assert.equal(result.shops.get(shopId("pharmacy")), 1);
});

test("a CatalogueItem's categoryId counts toward that Category", () => {
  const result = computeReferenceCounts({
    shopIds: [],
    categories: new Map([[categoryId("medicine"), { defaultShopId: shopId("pharmacy") }]]),
    catalogueItems: [{ categoryId: categoryId("medicine") }],
  });
  assert.equal(result.categories.get(categoryId("medicine")), 1);
});

test("a CatalogueItem's shopId override counts toward that Shop, on top of the Category's default", () => {
  const result = computeReferenceCounts({
    shopIds: [shopId("pharmacy"), shopId("grocery")],
    categories: new Map([[categoryId("medicine"), { defaultShopId: shopId("pharmacy") }]]),
    catalogueItems: [
      { categoryId: categoryId("medicine"), shopId: shopId("grocery") },
      { categoryId: categoryId("medicine") },
    ],
  });
  assert.equal(result.shops.get(shopId("pharmacy")), 1);
  assert.equal(result.shops.get(shopId("grocery")), 1);
  assert.equal(result.categories.get(categoryId("medicine")), 2);
});

test("a dangling reference to a Shop or Category outside the existing set is not counted", () => {
  const result = computeReferenceCounts({
    shopIds: [],
    categories: new Map(),
    catalogueItems: [{ categoryId: categoryId("deleted-category"), shopId: shopId("deleted-shop") }],
  });
  assert.equal(result.shops.size, 0);
  assert.equal(result.categories.size, 0);
});

test("counts every Shop and Category, not just the ones referenced", () => {
  const result = computeReferenceCounts({
    shopIds: [shopId("pharmacy"), shopId("unused-shop")],
    categories: new Map([
      [categoryId("medicine"), { defaultShopId: shopId("pharmacy") }],
      [categoryId("unused-category"), { defaultShopId: shopId("pharmacy") }],
    ]),
    catalogueItems: [{ categoryId: categoryId("medicine") }],
  });
  assert.equal(result.shops.size, 2);
  assert.equal(result.categories.size, 2);
  assert.equal(result.categories.get(categoryId("unused-category")), 0);
});
