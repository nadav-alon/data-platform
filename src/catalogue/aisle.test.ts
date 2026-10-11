import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AISLE_NAMES_COLLECTION,
  AISLES_COLLECTION,
  aisleId,
  aisleNameKey,
  aisleNameReservationSchema,
  aisleSchema,
  isAisleId,
  isAisleNameKey,
} from "./aisle.ts";
import { tagNameKey } from "./tag.ts";

test("accepts an Aisle with a name", () => {
  assert.equal(aisleSchema.parse({ name: "Dairy" }).name, "Dairy");
});

test("accepts a soft-deleted Aisle", () => {
  const deletedAt = { seconds: 1_700_000_000, nanoseconds: 0 };
  assert.deepEqual(aisleSchema.parse({ name: "Dairy", deletedAt }).deletedAt, deletedAt);
});

test("tolerates an unknown field", () => {
  assert.equal(aisleSchema.parse({ name: "Dairy", unexpected: true }).unexpected, true);
});

test("rejects an empty, blank or missing name", () => {
  assert.throws(() => aisleSchema.parse({ name: "" }));
  assert.throws(() => aisleSchema.parse({ name: "   " }));
  assert.throws(() => aisleSchema.parse({}));
});

test("rejects a non-timestamp deletedAt", () => {
  assert.throws(() => aisleSchema.parse({ name: "Dairy", deletedAt: "yesterday" }));
});

test("rejects a name Firestore refuses as a document id", () => {
  for (const name of [".", " .. ", "__x__", "x".repeat(101)]) {
    assert.throws(() => aisleSchema.parse({ name }), /document id/, JSON.stringify(name));
    assert.throws(() => aisleNameKey(name), /no key/, JSON.stringify(name));
  }
});

test("names the collections aisles and aisleNames", () => {
  assert.equal(AISLES_COLLECTION, "aisles");
  assert.equal(AISLE_NAMES_COLLECTION, "aisleNames");
});

test("guards and constructs an AisleId", () => {
  assert.equal(isAisleId("dairy"), true);
  assert.equal(isAisleId(""), false);
  assert.equal(aisleId("dairy"), "dairy");
  assert.throws(() => aisleId(""), /AisleId must not be empty/);
});

test("aisleNameKey ignores case and surrounding spaces", () => {
  assert.equal(aisleNameKey("  Frozen Food "), aisleNameKey("frozen food"));
});

test("aisleNameKey keeps inner spaces and escapes a slash and a percent", () => {
  assert.notEqual(aisleNameKey("frozen food"), aisleNameKey("frozenfood"));
  assert.equal(aisleNameKey("Fruit/Veg"), "fruit%2Fveg");
  assert.equal(aisleNameKey("100%"), "100%25");
});

test("aisleNameKey is built as tagNameKey is", () => {
  for (const name of ["Dairy", " Fruit/Veg ", "100%", "Ärger"]) {
    assert.equal(aisleNameKey(name), tagNameKey(name));
  }
});

test("guards an AisleNameKey", () => {
  assert.equal(isAisleNameKey("frozen food"), true);
  assert.equal(isAisleNameKey("Dairy"), false);
  assert.equal(isAisleNameKey("fruit/veg"), false);
  assert.equal(isAisleNameKey(""), false);
});

test("aisleNameKey throws on a blank name", () => {
  assert.throws(() => aisleNameKey("  "), /Aisle name has no key/);
});

test("accepts an Aisle name reservation naming its Aisle", () => {
  assert.equal(aisleNameReservationSchema.parse({ aisleId: "dairy" }).aisleId, "dairy");
});

test("rejects an Aisle name reservation without an Aisle", () => {
  assert.throws(() => aisleNameReservationSchema.parse({}));
});
