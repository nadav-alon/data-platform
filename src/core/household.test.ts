import { test } from "node:test";
import assert from "node:assert/strict";
import { HOUSEHOLD_DOC_PATH, householdMetaSchema } from "./household.ts";

test("doc path", () => {
  assert.equal(HOUSEHOLD_DOC_PATH, "meta/household");
});

test("accepts an owner uid", () => {
  assert.equal(householdMetaSchema.safeParse({ owner: "abc123" }).success, true);
});

test("rejects a missing owner", () => {
  assert.equal(householdMetaSchema.safeParse({}).success, false);
});

test("rejects an empty owner", () => {
  assert.equal(householdMetaSchema.safeParse({ owner: "" }).success, false);
});
