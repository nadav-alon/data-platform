import { test } from "node:test";
import assert from "node:assert/strict";
import { PLATFORM_DOC_PATH, checkPlatform, platformMetaSchema } from "./platform.ts";

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
  assert.equal(checkPlatform("1.2.3", "1.2.3"), "ok");
});

test("checkPlatform: ok when the deployed minor trails the required one", () => {
  assert.equal(checkPlatform("1.1.0", "1.2.3"), "ok");
});

test("checkPlatform: outdated when the deployed major trails the required one", () => {
  assert.equal(checkPlatform("1.9.9", "2.0.0"), "outdated");
});

test("checkPlatform: ok when the deployed version is newer than required", () => {
  assert.equal(checkPlatform("3.0.0", "2.0.0"), "ok");
});

test("checkPlatform: missing when nothing has been deployed", () => {
  assert.equal(checkPlatform(undefined, "1.0.0"), "missing");
});
