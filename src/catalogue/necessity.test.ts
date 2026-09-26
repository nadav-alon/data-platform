import { test } from "node:test";
import assert from "node:assert/strict";
import { necessitySchema } from "./necessity.ts";

test("accepts each Necessity value", () => {
  for (const value of ["essential", "important", "optional"]) {
    assert.equal(necessitySchema.parse(value), value);
  }
});

test("rejects a value outside the Necessity enum", () => {
  assert.throws(() => necessitySchema.parse("nice to have"));
});
