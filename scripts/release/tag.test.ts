import { test } from "node:test";
import assert from "node:assert/strict";
import { packageVersion } from "./version.ts";
import { isReleaseTag, releaseTag, releaseDecision, tagForVersion } from "./tag.ts";

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

test("tags when this commit changed the version and no tag exists yet", () => {
  const decision = releaseDecision(packageVersion("1.2.3"), packageVersion("1.2.2"), [
    releaseTag("v1.0.0"),
    releaseTag("v1.1.0"),
  ]);
  assert.deepEqual(decision, { kind: "tag", tag: "v1.2.3" });
});

test("tags when there is no previous commit to compare — the first release", () => {
  const decision = releaseDecision(packageVersion("1.2.3"), null, []);
  assert.deepEqual(decision, { kind: "tag", tag: "v1.2.3" });
});

test("is up-to-date once the version's tag already exists", () => {
  const decision = releaseDecision(packageVersion("1.2.3"), packageVersion("1.2.2"), [releaseTag("v1.2.3")]);
  assert.deepEqual(decision, { kind: "up-to-date" });
});

test("is missing when the tag doesn't exist but this push didn't change the version", () => {
  const decision = releaseDecision(packageVersion("1.2.3"), packageVersion("1.2.3"), [releaseTag("v1.0.0")]);
  assert.deepEqual(decision, { kind: "missing", tag: "v1.2.3" });
});
