import { test } from "node:test";
import assert from "node:assert/strict";
import { isKeyOutPath, keyOutPath } from "./key-out-path.ts";

test("accepts a path outside the repo", () => {
  assert.equal(keyOutPath("/home/me/key.json", "/home/me/data-platform"), "/home/me/key.json");
  assert.equal(isKeyOutPath("/home/me/data-platform-key.json", "/home/me/data-platform"), true);
});

test("refuses the repo root and anything under it", () => {
  assert.throws(() => keyOutPath("/home/me/data-platform", "/home/me/data-platform"), /outside the repo/);
  assert.throws(() => keyOutPath("/home/me/data-platform/key.json", "/home/me/data-platform"), /outside the repo/);
  assert.throws(
    () => keyOutPath("/home/me/data-platform/a/../b/key.json", "/home/me/data-platform"),
    /outside the repo/,
  );
});

test("resolves a relative path before checking it", () => {
  assert.throws(() => keyOutPath("key.json", process.cwd()), /outside the repo/);
});
