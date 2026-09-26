import { test } from "node:test";
import assert from "node:assert/strict";
import { isPackageVersion, packageVersion } from "./version.ts";

test("accepts a major.minor.patch version", () => {
  assert.equal(isPackageVersion("1.2.3"), true);
  assert.equal(packageVersion("1.2.3"), "1.2.3");
});

test("rejects a version carrying a pre-release or build tag", () => {
  assert.equal(isPackageVersion("1.2.3-beta.1"), false);
  assert.throws(() => packageVersion("1.2.3-beta.1"));
});
