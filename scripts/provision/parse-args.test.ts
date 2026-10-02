import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProvisionArgs } from "./parse-args.ts";

test("reads --project and --location", () => {
  assert.deepEqual(parseProvisionArgs(["--project", "my-household-42", "--location", "eur3"]), {
    kind: "run",
    project: "my-household-42",
    location: "eur3",
  });
});

test("accepts a region as the location", () => {
  const parsed = parseProvisionArgs(["--location", "europe-west1", "--project", "my-household-42"]);
  assert.equal(parsed.kind === "run" && parsed.location, "europe-west1");
});

test("rejects a missing --project", () => {
  assert.throws(() => parseProvisionArgs(["--location", "eur3"]), /Usage: --project <id>/);
});

test("rejects a missing --location, with no default", () => {
  assert.throws(() => parseProvisionArgs(["--project", "my-household-42"]), /--location <location>/);
});

test("rejects a flag with no value after it", () => {
  assert.throws(() => parseProvisionArgs(["--project", "my-household-42", "--location"]), /Usage/);
});

test("rejects a project id that isn't valid", () => {
  assert.throws(
    () => parseProvisionArgs(["--project", "AB", "--location", "eur3"]),
    /Not a Firebase project id/,
  );
});

test("rejects a location that isn't valid", () => {
  assert.throws(
    () => parseProvisionArgs(["--project", "my-household-42", "--location", "Europe West"]),
    /Not a Firestore location/,
  );
});

test("--help wins over missing flags", () => {
  assert.deepEqual(parseProvisionArgs(["--help"]), { kind: "help" });
});
