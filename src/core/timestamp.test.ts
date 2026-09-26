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

test("rejects negative nanoseconds", () => {
  assert.equal(
    firestoreTimestampSchema.safeParse({ seconds: 1, nanoseconds: -5 }).success,
    false,
  );
});

test("rejects nanoseconds at or above one billion", () => {
  assert.equal(
    firestoreTimestampSchema.safeParse({ seconds: 1, nanoseconds: 1e9 }).success,
    false,
  );
});

test("rejects a fractional seconds value", () => {
  assert.equal(
    firestoreTimestampSchema.safeParse({ seconds: 1.5, nanoseconds: 0 }).success,
    false,
  );
});

test("rejects NaN and Infinity", () => {
  assert.equal(
    firestoreTimestampSchema.safeParse({ seconds: NaN, nanoseconds: 0 }).success,
    false,
  );
  assert.equal(
    firestoreTimestampSchema.safeParse({ seconds: Infinity, nanoseconds: 0 }).success,
    false,
  );
});

test("rejects an array carrying both properties", () => {
  const value = Object.assign([], { seconds: 1, nanoseconds: 0 });
  assert.equal(firestoreTimestampSchema.safeParse(value).success, false);
});
