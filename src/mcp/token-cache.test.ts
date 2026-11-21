import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileTokenCache } from "./token-cache.ts";

test("a saved refresh token is loaded back from a file only the developer can read", () => {
  const dir = join(mkdtempSync(join(tmpdir(), "mcp-cache-")), "nested");
  const cache = fileTokenCache(dir);
  assert.equal(cache.load(), undefined);

  cache.save("refresh-1");
  cache.save("refresh-2");

  assert.equal(fileTokenCache(dir).load(), "refresh-2");
  assert.equal(statSync(join(dir, "tokens.json")).mode & 0o777, 0o600);
});

test("a corrupt cache file loads as no token", () => {
  const dir = mkdtempSync(join(tmpdir(), "mcp-cache-"));
  writeFileSync(join(dir, "tokens.json"), "{not json");

  assert.equal(fileTokenCache(dir).load(), undefined);
});
