import { test } from "node:test";
import assert from "node:assert/strict";
import { stateHistoryEntrySchema } from "./state-history.ts";

test("accepts a State history entry", () => {
  const at = new Date();
  const entry = stateHistoryEntrySchema.parse({ state: "out", at });
  assert.equal(entry.state, "out");
  assert.deepEqual(entry.at, at);
});

test("accepts a Firestore Timestamp-shaped at", () => {
  const at = { seconds: 1_700_000_000, nanoseconds: 0 };
  const entry = stateHistoryEntrySchema.parse({ state: "out", at });
  assert.deepEqual(entry.at, at);
});

test("tolerates an unknown field", () => {
  const entry = stateHistoryEntrySchema.parse({ state: "out", at: new Date(), unexpected: true });
  assert.equal(entry.unexpected, true);
});

test("rejects a missing at", () => {
  assert.throws(() => stateHistoryEntrySchema.parse({ state: "out" }));
});

test("rejects a state outside the State enum", () => {
  assert.throws(() => stateHistoryEntrySchema.parse({ state: "almost gone", at: new Date() }));
});
