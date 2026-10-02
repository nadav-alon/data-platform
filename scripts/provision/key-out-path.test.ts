import { test } from "node:test";
import assert from "node:assert/strict";
import { isKeyOutPath, keyOutPath } from "./key-out-path.ts";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

test("refuses a repo directory whose name starts with two dots", () => {
  assert.throws(() => keyOutPath("/home/me/data-platform/..keys/key.json", "/home/me/data-platform"), /outside the repo/);
  assert.equal(isKeyOutPath("/home/me/..keys/key.json", "/home/me/data-platform"), true);
});

test("follows symlinks into the repo, from the key's directory or the repo root", () => {
  const dir = mkdtempSync(join(tmpdir(), "key-out-"));
  try {
    const repo = join(dir, "repo");
    mkdirSync(repo);
    symlinkSync(repo, join(dir, "keys"));
    assert.throws(() => keyOutPath(join(dir, "keys", "key.json"), repo), /outside the repo/);
    symlinkSync(repo, join(dir, "clone"));
    assert.throws(() => keyOutPath(join(repo, "key.json"), join(dir, "clone")), /outside the repo/);
    assert.equal(keyOutPath(join(dir, "key.json"), join(dir, "clone")), join(dir, "key.json"));
  } finally {
    rmSync(dir, { recursive: true });
  }
});
