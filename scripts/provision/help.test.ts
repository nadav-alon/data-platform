import { test } from "node:test";
import assert from "node:assert/strict";
import { HELP } from "./help.ts";

test("explains the project id rules", () => {
  assert.match(HELP, /6-30 lowercase/);
});

test("links the Firestore locations list", () => {
  assert.match(HELP, /https:\/\/firebase\.google\.com\/docs\/firestore\/locations/);
});

test("says what the snippet is for", () => {
  assert.match(HELP, /SDK config snippet/);
  assert.match(HELP, /upstream\s+app's Firebase SDK/);
});

test("names the login command", () => {
  assert.match(HELP, /npx firebase login/);
});
