import { test } from "node:test";
import assert from "node:assert/strict";
import { packageVersion } from "./version.ts";
import { pendingReleaseTag, releaseTagFor } from "./tag.ts";

test("names the tag v<version>", () => {
  assert.equal(releaseTagFor(packageVersion("1.2.3")), "v1.2.3");
});

test("is pending when no tag exists yet for the version", () => {
  const tag = pendingReleaseTag(packageVersion("1.2.3"), ["v1.0.0", "v1.1.0"]);
  assert.equal(tag, "v1.2.3");
});

test("is not pending once the version's tag already exists", () => {
  const tag = pendingReleaseTag(packageVersion("1.2.3"), ["v1.2.3"]);
  assert.equal(tag, null);
});
