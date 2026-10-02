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

test("explains --key-out: what the key is for, and to keep it out of the repo", () => {
  assert.match(HELP, /--key-out <path>/);
  assert.match(HELP, /FIREBASE_SERVICE_ACCOUNT/);
  assert.match(HELP, /deploy/);
  assert.match(HELP, /out of the repo/);
});

test("names where to install gcloud and how to log it in", () => {
  assert.match(HELP, /https:\/\/cloud\.google\.com\/sdk\/docs\/install/);
  assert.match(HELP, /gcloud auth login/);
});
