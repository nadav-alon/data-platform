import { test } from "node:test";
import assert from "node:assert/strict";
import { stateSchema } from "./state.ts";

test("accepts each State value", () => {
  for (const value of ["enough", "running low", "out"]) {
    assert.equal(stateSchema.parse(value), value);
  }
});

test("rejects a value outside the State enum", () => {
  assert.throws(() => stateSchema.parse("almost gone"));
});
