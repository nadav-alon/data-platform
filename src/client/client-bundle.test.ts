import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTH_EMULATOR_PORT,
  FIRESTORE_EMULATOR_PORT,
  LOCAL_PROJECT_ID,
} from "../local/emulator-config.ts";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const OWN_PACKAGE = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'](data-platform[^"']*)["']/g;
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.[^"']*)["']/g;

/** Every source file a bundler would pull in from `entry`, following relative imports only; the first test below fails on an import of the package by its own name, which this walk cannot follow. */
function reachableFrom(entry: string): Map<string, string> {
  const files = new Map<string, string>();
  const pending = [entry];
  for (let path = pending.pop(); path !== undefined; path = pending.pop()) {
    if (files.has(path)) continue;
    const source = readFileSync(path, "utf8");
    files.set(path, source);
    for (const match of source.matchAll(SPECIFIER)) {
      pending.push(join(dirname(path), match[1] as string));
    }
  }
  return files;
}

const bundle = reachableFrom(join(SRC, "client", "index.ts"));

test("a bundle importing only data-platform/client never imports the package by its own name", () => {
  const own = [...bundle].flatMap(([path, source]) =>
    [...source.matchAll(OWN_PACKAGE)].map((m) => `${relative(SRC, path)} imports ${m[1]}`),
  );

  assert.deepEqual(own, []);
});

test("a bundle importing only data-platform/client reaches nothing under local/", () => {
  const local = [...bundle.keys()].map((p) => relative(SRC, p)).filter((p) => p.startsWith(`local${sep}`));

  assert.deepEqual(local, []);
});

test("a bundle importing only data-platform/client carries none of the local kit's markers", () => {
  const markers = [LOCAL_PROJECT_ID, String(FIRESTORE_EMULATOR_PORT), String(AUTH_EMULATOR_PORT)];

  for (const [path, source] of bundle) {
    for (const marker of markers) {
      assert.ok(!source.includes(marker), `${relative(SRC, path)} carries ${marker}`);
    }
  }
});
