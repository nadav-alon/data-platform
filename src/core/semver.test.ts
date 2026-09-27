import { test } from "node:test";
import assert from "node:assert/strict";
import { isSemver, semver, semverMajor, semverMinor } from "./semver.ts";

test("accepts a major.minor.patch version", () => {
  assert.equal(isSemver("1.2.3"), true);
  assert.equal(semver("1.2.3"), "1.2.3");
});

test("accepts a pre-release version", () => {
  assert.equal(isSemver("1.2.3-beta.1"), true);
});

test("rejects a version missing a patch number", () => {
  assert.equal(isSemver("1.2"), false);
  assert.throws(() => semver("1.2"), /Not a Semver/);
});

test("rejects a leading v", () => {
  assert.equal(isSemver("v1.2.3"), false);
});

test("semverMajor reads the leading component", () => {
  assert.equal(semverMajor(semver("2.10.4")), 2);
  assert.equal(semverMajor(semver("0.1.0")), 0);
});

test("semverMinor reads the middle component", () => {
  assert.equal(semverMinor(semver("2.10.4")), 10);
  assert.equal(semverMinor(semver("0.1.0")), 1);
});
