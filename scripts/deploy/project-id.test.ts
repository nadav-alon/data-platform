import { test } from "node:test";
import assert from "node:assert/strict";
import { isFirebaseProjectId, firebaseProjectId } from "./project-id.ts";

test("accepts a lowercase, hyphenated project id", () => {
  assert.equal(isFirebaseProjectId("my-household-42"), true);
  assert.equal(firebaseProjectId("my-household-42"), "my-household-42");
});

test("rejects a project id shorter than 6 characters", () => {
  assert.equal(isFirebaseProjectId("ab-cd"), false);
  assert.throws(() => firebaseProjectId("ab-cd"), /Not a Firebase project id/);
});

test("rejects a project id starting with a digit", () => {
  assert.equal(isFirebaseProjectId("1household"), false);
});

test("rejects a project id ending with a hyphen", () => {
  assert.equal(isFirebaseProjectId("household-"), false);
});

test("rejects a project id with an uppercase letter", () => {
  assert.equal(isFirebaseProjectId("Household1"), false);
});
