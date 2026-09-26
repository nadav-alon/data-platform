import { test } from "node:test";
import assert from "node:assert/strict";
import { packageVersion } from "./version.ts";
import { isReleaseTag, releaseTag, pendingReleaseTag, tagForVersion } from "./tag.ts";

test("accepts a v<version> tag", () => {
  assert.equal(isReleaseTag("v1.2.3"), true);
  assert.equal(releaseTag("v1.2.3"), "v1.2.3");
});

test("rejects a tag not shaped v<version>", () => {
  assert.equal(isReleaseTag("1.2.3"), false);
  assert.throws(() => releaseTag("1.2.3"));
});

test("names the tag v<version>", () => {
  assert.equal(tagForVersion(packageVersion("1.2.3")), "v1.2.3");
});

test("is pending when no tag exists yet for the version", () => {
  const tag = pendingReleaseTag(packageVersion("1.2.3"), [releaseTag("v1.0.0"), releaseTag("v1.1.0")]);
  assert.equal(tag, "v1.2.3");
});

test("is not pending once the version's tag already exists", () => {
  const tag = pendingReleaseTag(packageVersion("1.2.3"), [releaseTag("v1.2.3")]);
  assert.equal(tag, null);
});
