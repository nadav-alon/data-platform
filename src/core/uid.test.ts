import { test } from "node:test";
import assert from "node:assert/strict";
import { isUid, uid } from "./uid.ts";

test("accepts a non-empty string", () => {
  assert.equal(isUid("abc123"), true);
  assert.equal(uid("abc123"), "abc123");
});

test("rejects an empty string", () => {
  assert.equal(isUid(""), false);
  assert.throws(() => uid(""), /Not a Uid/);
});
