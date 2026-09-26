import { test } from "node:test";
import assert from "node:assert/strict";
import { isEmail, email } from "./email.ts";

test("accepts a well-formed email address", () => {
  assert.equal(isEmail("owner@example.com"), true);
  assert.equal(email("owner@example.com"), "owner@example.com");
});

test("rejects a string without an @", () => {
  assert.equal(isEmail("not-an-email"), false);
  assert.throws(() => email("not-an-email"), /Not an Email/);
});
