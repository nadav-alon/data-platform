import { test } from "node:test";
import assert from "node:assert/strict";
import { isStoreId, storeId, storeIdSchema, storeSchema, STORES_COLLECTION } from "./store.ts";

const osherAd = { name: "Osher Ad", shopId: "grocery" };

test("accepts a Store with a name and a Shop", () => {
  const store = storeSchema.parse(osherAd);
  assert.equal(store.name, "Osher Ad");
  assert.equal(store.shopId, "grocery");
});

test("defaults aisleOrder to empty", () => {
  assert.deepEqual(storeSchema.parse(osherAd).aisleOrder, []);
});

test("keeps the order of aisleOrder", () => {
  const aisleOrder = ["produce", "dairy", "frozen"];
  assert.deepEqual(storeSchema.parse({ ...osherAd, aisleOrder }).aisleOrder, aisleOrder);
});

test("rejects an aisleOrder that repeats an Aisle", () => {
  assert.throws(() => storeSchema.parse({ ...osherAd, aisleOrder: ["dairy", "frozen", "dairy"] }));
});

test("rejects an empty Aisle id in aisleOrder", () => {
  assert.throws(() => storeSchema.parse({ ...osherAd, aisleOrder: [""] }));
});

test("rejects an empty, blank or missing name", () => {
  assert.throws(() => storeSchema.parse({ ...osherAd, name: "" }));
  assert.throws(() => storeSchema.parse({ ...osherAd, name: "  \t" }));
  assert.throws(() => storeSchema.parse({ shopId: "grocery" }));
});

test("rejects an empty or missing shopId", () => {
  assert.throws(() => storeSchema.parse({ ...osherAd, shopId: "" }));
  assert.throws(() => storeSchema.parse({ name: "Osher Ad" }));
});

test("accepts a soft-deleted Store", () => {
  const deletedAt = { seconds: 1_700_000_000, nanoseconds: 0 };
  assert.deepEqual(storeSchema.parse({ ...osherAd, deletedAt }).deletedAt, deletedAt);
});

test("rejects a non-timestamp deletedAt", () => {
  assert.throws(() => storeSchema.parse({ ...osherAd, deletedAt: "yesterday" }));
});

test("tolerates an unknown field", () => {
  assert.equal(storeSchema.parse({ ...osherAd, unexpected: true }).unexpected, true);
});

test("names the collection stores", () => {
  assert.equal(STORES_COLLECTION, "stores");
});

test("guards and constructs a StoreId", () => {
  assert.equal(isStoreId("osherAd"), true);
  assert.equal(isStoreId(""), false);
  assert.equal(storeId("osherAd"), "osherAd");
  assert.throws(() => storeId(""), /StoreId must not be empty/);
  assert.equal(storeIdSchema.safeParse("").success, false);
});
