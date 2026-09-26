import { test } from "node:test";
import assert from "node:assert/strict";
import { PLATFORM_DOC_PATH, platformMetaSchema } from "./platform.ts";

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
