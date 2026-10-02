import { existsSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

declare const keyOutPathBrand: unique symbol;

/** An absolute path for the deploy key that lies outside the repo, so the key can't be committed. */
export type KeyOutPath = string & { readonly [keyOutPathBrand]: true };

function isInside(root: string, path: string): boolean {
  const from = relative(root, path);
  return from === "" || (from !== ".." && !from.startsWith(".." + sep) && !isAbsolute(from));
}

/** `path` with symlinks followed as far as it exists; the part that doesn't exist yet is kept as is. */
function realPathOf(path: string): string {
  if (existsSync(path)) return realpathSync(path);
  const parent = dirname(path);
  return parent === path ? path : join(realPathOf(parent), basename(path));
}

/** Whether `value` is absolute and, once symlinks are followed, outside `repoRoot`. */
export function isKeyOutPath(value: string, repoRoot: string): value is KeyOutPath {
  return isAbsolute(value) && !isInside(realPathOf(resolve(repoRoot)), realPathOf(resolve(value)));
}

/** Resolves `value` against the working directory, or throws if it lands inside `repoRoot`. */
export function keyOutPath(value: string, repoRoot: string): KeyOutPath {
  const absolute = resolve(value);
  if (!isKeyOutPath(absolute, repoRoot)) {
    throw new Error(`--key-out must be outside the repo, so the key can't be committed: ${value}`);
  }
  return absolute;
}
