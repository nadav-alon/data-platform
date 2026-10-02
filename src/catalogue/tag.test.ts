import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isTagId,
  tagId,
  tagNameClaimSchema,
  tagNameKey,
  tagSchema,
  TAGS_COLLECTION,
} from "./tag.ts";

test("accepts a Tag with a name", () => {
  assert.equal(tagSchema.parse({ name: "Gluten free" }).name, "Gluten free");
});

test("accepts a soft-deleted Tag", () => {
  const deletedAt = { seconds: 1_700_000_000, nanoseconds: 0 };
  assert.deepEqual(tagSchema.parse({ name: "Gluten free", deletedAt }).deletedAt, deletedAt);
});

test("tolerates an unknown field", () => {
  assert.equal(tagSchema.parse({ name: "Gluten free", unexpected: true }).unexpected, true);
});

test("rejects an empty name", () => {
  assert.throws(() => tagSchema.parse({ name: "" }));
});

test("rejects a missing name", () => {
  assert.throws(() => tagSchema.parse({}));
});

test("rejects a non-timestamp deletedAt", () => {
  assert.throws(() => tagSchema.parse({ name: "Gluten free", deletedAt: "yesterday" }));
});

test("names the collection tags", () => {
  assert.equal(TAGS_COLLECTION, "tags");
});

test("guards and constructs a TagId", () => {
  assert.equal(isTagId("glutenFree"), true);
  assert.equal(isTagId(""), false);
  assert.equal(tagId("glutenFree"), "glutenFree");
  assert.throws(() => tagId(""), /TagId must not be empty/);
});

test("tagNameKey ignores case and surrounding spaces", () => {
  assert.equal(tagNameKey("  Gluten Free "), tagNameKey("gluten free"));
});

test("tagNameKey keeps inner spaces", () => {
  assert.notEqual(tagNameKey("gluten free"), tagNameKey("glutenfree"));
});

test("tagNameKey escapes a slash so the key is one doc id", () => {
  assert.equal(tagNameKey("Fruit/Veg"), "fruit%2Fveg");
  assert.notEqual(tagNameKey("a/b"), tagNameKey("a%2Fb"));
});

test("accepts a Tag name claim naming its Tag", () => {
  assert.equal(tagNameClaimSchema.parse({ tagId: "vegan" }).tagId, "vegan");
});

test("rejects a Tag name claim without a Tag", () => {
  assert.throws(() => tagNameClaimSchema.parse({}));
});

test("rejects a blank name", () => {
  assert.throws(() => tagSchema.parse({ name: "   " }));
});
