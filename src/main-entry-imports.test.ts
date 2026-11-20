import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const IMPORT_SPECIFIER = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

/** Every bare (non-relative) specifier imported by `entry` or anything it reaches by relative import. */
function bareImportsReachableFrom(entry: string): Set<string> {
  const bare = new Set<string>();
  const seen = new Set<string>();
  const queue = [entry];
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    if (seen.has(file)) continue;
    seen.add(file);
    for (const match of readFileSync(file, "utf8").matchAll(IMPORT_SPECIFIER)) {
      const specifier = match[1] as string;
      if (specifier.startsWith(".")) queue.push(resolve(dirname(file), specifier));
      else bare.add(specifier);
    }
  }
  return bare;
}

test("the main entry imports nothing from firebase", () => {
  const bare = bareImportsReachableFrom(resolve(import.meta.dirname, "index.ts"));

  assert.ok(bare.has("zod"), "the walk reaches the zod imports");
  assert.deepEqual(
    [...bare].filter((specifier) => specifier.startsWith("firebase")),
    [],
  );
});
