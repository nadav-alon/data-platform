import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("the bin without a config exits 1 saying where the config goes, keeping stdout clear for MCP", () => {
  const dir = mkdtempSync(join(tmpdir(), "mcp-bin-"));

  const result = spawnSync(process.execPath, [join(import.meta.dirname, "bin.ts")], {
    env: { PATH: process.env.PATH, DATA_PLATFORM_MCP_DIR: dir },
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.ok(result.stderr.includes(join(dir, "config.json")), result.stderr);
});
