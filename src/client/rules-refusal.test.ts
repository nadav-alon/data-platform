import { test } from "node:test";
import assert from "node:assert/strict";
import { FirebaseError } from "firebase/app";
import { isRulesRefusal } from "./rules-refusal.ts";

test("isRulesRefusal is true for a FirebaseError with code permission-denied", () => {
  assert.equal(isRulesRefusal(new FirebaseError("permission-denied", "denied")), true);
});

test("isRulesRefusal is false for a FirebaseError with a different code", () => {
  assert.equal(isRulesRefusal(new FirebaseError("unavailable", "offline")), false);
});

test("isRulesRefusal is false for a plain Error", () => {
  assert.equal(isRulesRefusal(new Error("boom")), false);
});
