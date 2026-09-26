import { test } from "node:test";
import assert from "node:assert/strict";
import { firestoreTimestampSchema } from "./timestamp.ts";

test("accepts an object with numeric seconds and nanoseconds", () => {
  assert.equal(
    firestoreTimestampSchema.safeParse({ seconds: 1_700_000_000, nanoseconds: 0 }).success,
    true,
  );
});

test("rejects a plain Date", () => {
  assert.equal(firestoreTimestampSchema.safeParse(new Date()).success, false);
});

test("rejects a value missing nanoseconds", () => {
  assert.equal(firestoreTimestampSchema.safeParse({ seconds: 1 }).success, false);
});
