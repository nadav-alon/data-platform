import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORIES_COLLECTION,
  categoryId,
  categorySchema,
  isCategoryId,
} from "./category.ts";

test("accepts a Category with a name and a default Shop", () => {
  const category = categorySchema.parse({ name: "Medicine", defaultShopId: "pharmacy" });
  assert.equal(category.name, "Medicine");
  assert.equal(category.defaultShopId, "pharmacy");
});

test("tolerates an unknown field", () => {
  const category = categorySchema.parse({
    name: "Medicine",
    defaultShopId: "pharmacy",
    unexpected: true,
  });
  assert.equal(category.unexpected, true);
});

test("rejects an empty name", () => {
  assert.throws(() => categorySchema.parse({ name: "", defaultShopId: "pharmacy" }));
});

test("rejects a missing name", () => {
  assert.throws(() => categorySchema.parse({ defaultShopId: "pharmacy" }));
});

test("rejects a missing defaultShopId", () => {
  assert.throws(() => categorySchema.parse({ name: "Medicine" }));
});

test("rejects an empty defaultShopId", () => {
  assert.throws(() => categorySchema.parse({ name: "Medicine", defaultShopId: "" }));
});

test("CATEGORIES_COLLECTION is stable", () => {
  assert.equal(CATEGORIES_COLLECTION, "categories");
});

test("isCategoryId accepts a non-empty string", () => {
  assert.equal(isCategoryId("medicine"), true);
});

test("isCategoryId rejects an empty string", () => {
  assert.equal(isCategoryId(""), false);
});

test("categoryId narrows a valid value", () => {
  assert.equal(categoryId("medicine"), "medicine");
});

test("categoryId throws on an empty value", () => {
  assert.throws(() => categoryId(""));
});
