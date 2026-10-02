import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isTagId,
  isTagNameKey,
  tagId,
  tagNameReservationSchema,
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

test("accepts a Tag name reservation naming its Tag", () => {
  assert.equal(tagNameReservationSchema.parse({ tagId: "vegan" }).tagId, "vegan");
});

test("rejects a Tag name reservation without a Tag", () => {
  assert.throws(() => tagNameReservationSchema.parse({}));
});

test("rejects a blank name", () => {
  assert.throws(() => tagSchema.parse({ name: "   " }));
});

test("guards a TagNameKey", () => {
  assert.equal(isTagNameKey("gluten free"), true);
  assert.equal(isTagNameKey("fruit%2Fveg"), true);
  assert.equal(isTagNameKey("100%25"), true);
  assert.equal(isTagNameKey(""), false);
  assert.equal(isTagNameKey("Vegan"), false);
  assert.equal(isTagNameKey(" vegan"), false);
  assert.equal(isTagNameKey("fruit/veg"), false);
  assert.equal(isTagNameKey("100%"), false);
});

test("tagNameKey throws on a blank name", () => {
  assert.throws(() => tagNameKey("  "), /Tag name has no key/);
});

test("tagNameKey trims only ASCII whitespace and lowercases only ASCII", () => {
  assert.equal(tagNameKey("\t Vegan\r\n"), "vegan");
  assert.equal(tagNameKey(" Vegan"), " vegan");
  assert.notEqual(tagNameKey("Ärger"), tagNameKey("ärger"));
});

test("tagSchema treats only ASCII whitespace as blank", () => {
  assert.throws(() => tagSchema.parse({ name: " \t\r\n" }));
  assert.equal(tagSchema.parse({ name: " " }).name, " ");
});
