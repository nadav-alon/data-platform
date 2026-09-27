import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProjectId } from "./parse-args.ts";

test("reads the id following --project", () => {
  assert.equal(parseProjectId(["--project", "my-household-42"]), "my-household-42");
});

test("ignores arguments before --project", () => {
  assert.equal(parseProjectId(["--verbose", "--project", "my-household-42"]), "my-household-42");
});

test("rejects a missing --project flag", () => {
  assert.throws(() => parseProjectId([]), /Usage: --project <id>/);
});

test("rejects --project with no value after it", () => {
  assert.throws(() => parseProjectId(["--project"]), /Usage: --project <id>/);
});

test("rejects a value that isn't a valid Firebase project id", () => {
  assert.throws(() => parseProjectId(["--project", "AB"]), /Not a Firebase project id/);
});
