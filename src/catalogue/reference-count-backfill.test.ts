import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryId } from "./category.ts";
import { computeReferenceCounts, parseExistingCatalogue } from "./reference-count-backfill.ts";
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

test("parseExistingCatalogue reads well-formed docs", () => {
  const { existing, skipped } = parseExistingCatalogue(
    [{ id: "pharmacy", data: {} }],
    [{ id: "medicine", data: { defaultShopId: "pharmacy" } }],
    [{ id: "item-1", data: { categoryId: "medicine", shopId: "pharmacy" } }],
  );
  assert.deepEqual(skipped, []);
  assert.deepEqual(existing.shopIds, [shopId("pharmacy")]);
  assert.deepEqual(existing.categories.get(categoryId("medicine")), { defaultShopId: shopId("pharmacy") });
  assert.deepEqual(existing.catalogueItems, [
    { categoryId: categoryId("medicine"), shopId: shopId("pharmacy") },
  ]);
});

test("parseExistingCatalogue treats a null CatalogueItem shopId as no override, matching firestore.rules", () => {
  const { existing, skipped } = parseExistingCatalogue(
    [],
    [{ id: "medicine", data: { defaultShopId: "pharmacy" } }],
    [{ id: "item-1", data: { categoryId: "medicine", shopId: null } }],
  );
  assert.deepEqual(skipped, []);
  assert.deepEqual(existing.catalogueItems, [{ categoryId: categoryId("medicine"), shopId: undefined }]);
});

test("parseExistingCatalogue treats a missing CatalogueItem shopId as no override", () => {
  const { existing, skipped } = parseExistingCatalogue(
    [],
    [{ id: "medicine", data: { defaultShopId: "pharmacy" } }],
    [{ id: "item-1", data: { categoryId: "medicine" } }],
  );
  assert.deepEqual(skipped, []);
  assert.deepEqual(existing.catalogueItems, [{ categoryId: categoryId("medicine"), shopId: undefined }]);
});

test("parseExistingCatalogue skips and reports a Category with a missing defaultShopId", () => {
  const { existing, skipped } = parseExistingCatalogue(
    [],
    [{ id: "medicine", data: {} }],
    [],
  );
  assert.equal(existing.categories.size, 0);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0]?.id, "medicine");
});

test("parseExistingCatalogue skips and reports a Category with a null defaultShopId", () => {
  const { existing, skipped } = parseExistingCatalogue(
    [],
    [{ id: "medicine", data: { defaultShopId: null } }],
    [],
  );
  assert.equal(existing.categories.size, 0);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0]?.id, "medicine");
});

test("parseExistingCatalogue skips and reports a CatalogueItem with a missing categoryId", () => {
  const { existing, skipped } = parseExistingCatalogue([], [], [{ id: "item-1", data: {} }]);
  assert.equal(existing.catalogueItems.length, 0);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0]?.id, "item-1");
});

test("parseExistingCatalogue skips and reports a CatalogueItem with an invalid shopId", () => {
  const { existing, skipped } = parseExistingCatalogue(
    [],
    [],
    [{ id: "item-1", data: { categoryId: "medicine", shopId: "" } }],
  );
  assert.equal(existing.catalogueItems.length, 0);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0]?.id, "item-1");
});

test("a soft-deleted Category does not count toward its default Shop, but still gets its own count", () => {
  const result = computeReferenceCounts({
    shopIds: [shopId("pharmacy")],
    categories: new Map([
      [categoryId("medicine"), { defaultShopId: shopId("pharmacy"), softDeleted: true }],
      [categoryId("vitamins"), { defaultShopId: shopId("pharmacy") }],
    ]),
    catalogueItems: [],
  });
  assert.equal(result.shops.get(shopId("pharmacy")), 1);
  assert.equal(result.categories.get(categoryId("medicine")), 0);
});

test("parseExistingCatalogue marks a Category with a deletedAt as soft-deleted, and one with a null deletedAt as live", () => {
  const { existing, skipped } = parseExistingCatalogue(
    [],
    [
      { id: "medicine", data: { defaultShopId: "pharmacy", deletedAt: new Date(0) } },
      { id: "vitamins", data: { defaultShopId: "pharmacy", deletedAt: null } },
    ],
    [],
  );
  assert.deepEqual(skipped, []);
  assert.deepEqual(existing.categories.get(categoryId("medicine")), {
    defaultShopId: shopId("pharmacy"),
    softDeleted: true,
  });
  assert.deepEqual(existing.categories.get(categoryId("vitamins")), { defaultShopId: shopId("pharmacy") });
});
