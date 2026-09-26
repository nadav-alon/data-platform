import { test } from "node:test";
import assert from "node:assert/strict";
import packageJson from "../../package.json" with { type: "json" };
import { PLATFORM_VERSION, PLATFORM_DOC_PATH, checkPlatform, platformMetaSchema } from "./platform.ts";
import { semver, semverMajor } from "./semver.ts";

test("doc path", () => {
  assert.equal(PLATFORM_DOC_PATH, "meta/platform");
});

test("accepts a semver version", () => {
  assert.equal(platformMetaSchema.safeParse({ version: "0.1.0" }).success, true);
});

test("tolerates unknown fields", () => {
  const result = platformMetaSchema.safeParse({ version: "0.1.0", deployedAt: "0.1.0" });
  assert.ok(result.success);
  assert.equal("deployedAt" in result.data, false);
});

test("rejects a missing version", () => {
  assert.equal(platformMetaSchema.safeParse({}).success, false);
});

test("rejects a non-semver version", () => {
  assert.equal(platformMetaSchema.safeParse({ version: "v1" }).success, false);
});

test("rejects a non-string version", () => {
  assert.equal(platformMetaSchema.safeParse({ version: 1 }).success, false);
});

test("checkPlatform: ok when the deployed version equals the required one", () => {
  assert.equal(checkPlatform(semver("1.2.3"), semver("1.2.3")), "ok");
});

test("checkPlatform: ok when the deployed minor trails the required one", () => {
  assert.equal(checkPlatform(semver("1.1.0"), semver("1.2.3")), "ok");
});

test("checkPlatform: outdated when the deployed major trails the required one", () => {
  assert.equal(checkPlatform(semver("1.9.9"), semver("2.0.0")), "outdated");
});

test("checkPlatform: ok when the deployed version is newer than required", () => {
  assert.equal(checkPlatform(semver("3.0.0"), semver("2.0.0")), "ok");
});

test("checkPlatform: missing when nothing has been deployed", () => {
  assert.equal(checkPlatform(undefined, semver("1.0.0")), "missing");
});

test("checkPlatform: defaults required to the platform version this build requires", () => {
  assert.equal(PLATFORM_VERSION, packageJson.version);

  const sameMajor = semver(`${semverMajor(PLATFORM_VERSION)}.0.0`);
  const newerMajor = semver(`${semverMajor(PLATFORM_VERSION) + 1}.0.0`);
  assert.equal(checkPlatform(sameMajor), checkPlatform(sameMajor, PLATFORM_VERSION));
  assert.notEqual(checkPlatform(sameMajor), checkPlatform(sameMajor, newerMajor));
});

test("checkPlatform: a malformed deployed value cannot be constructed", () => {
  assert.throws(() => semver("v1"), /Not a Semver/);
});
