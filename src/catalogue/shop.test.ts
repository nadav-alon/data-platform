import { test } from "node:test";
import assert from "node:assert/strict";
import { SHOPS_COLLECTION, isShopId, shopId, shopSchema } from "./shop.ts";

test("accepts a Shop with a name", () => {
  const shop = shopSchema.parse({ name: "Pharmacy", referenceCount: 0 });
  assert.equal(shop.name, "Pharmacy");
});

test("tolerates an unknown field", () => {
  const shop = shopSchema.parse({ name: "Pharmacy", referenceCount: 0, unexpected: true });
  assert.equal(shop.unexpected, true);
});

test("rejects an empty name", () => {
  assert.throws(() => shopSchema.parse({ name: "", referenceCount: 0 }));
});

test("rejects a missing name", () => {
  assert.throws(() => shopSchema.parse({ referenceCount: 0 }));
});

test("rejects a non-string name", () => {
  assert.throws(() => shopSchema.parse({ name: 123, referenceCount: 0 }));
});

test("rejects a missing referenceCount", () => {
  assert.throws(() => shopSchema.parse({ name: "Pharmacy" }));
});

test("rejects a negative referenceCount", () => {
  assert.throws(() => shopSchema.parse({ name: "Pharmacy", referenceCount: -1 }));
});

test("rejects a non-integer referenceCount", () => {
  assert.throws(() => shopSchema.parse({ name: "Pharmacy", referenceCount: 1.5 }));
});

test("SHOPS_COLLECTION is stable", () => {
  assert.equal(SHOPS_COLLECTION, "shops");
});

test("isShopId accepts a non-empty string", () => {
  assert.equal(isShopId("pharmacy"), true);
});

test("isShopId rejects an empty string", () => {
  assert.equal(isShopId(""), false);
});

test("shopId narrows a valid value", () => {
  assert.equal(shopId("pharmacy"), "pharmacy");
});

test("shopId throws on an empty value", () => {
  assert.throws(() => shopId(""));
});

test("accepts a Shop soft-deleted with a deletedAt timestamp", () => {
  const shop = shopSchema.parse({
    name: "Pharmacy",
    referenceCount: 0,
    deletedAt: { seconds: 1_700_000_000, nanoseconds: 0 },
  });
  assert.equal(shop.deletedAt?.seconds, 1_700_000_000);
});

test("rejects a non-timestamp deletedAt", () => {
  assert.throws(() => shopSchema.parse({ name: "Pharmacy", referenceCount: 0, deletedAt: "yesterday" }));
});
