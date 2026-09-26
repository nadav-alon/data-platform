import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogueItemSchema } from "./catalogue-item.ts";
import { categorySchema } from "./category.ts";
import { resolveShop } from "./resolve-shop.ts";

const category = categorySchema.parse({ name: "Medicine", defaultShopId: "pharmacy" });

test("resolves to the Category's default when there is no override", () => {
  const catalogueItem = catalogueItemSchema.parse({
    categoryId: "medicine",
    necessity: "essential",
  });
  assert.equal(resolveShop(catalogueItem, category), "pharmacy");
});

test("resolves to the CatalogueItem's override when set", () => {
  const catalogueItem = catalogueItemSchema.parse({
    categoryId: "medicine",
    necessity: "essential",
    shopId: "corner-pharmacy",
  });
  assert.equal(resolveShop(catalogueItem, category), "corner-pharmacy");
});
