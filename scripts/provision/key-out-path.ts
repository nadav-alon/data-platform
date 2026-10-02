import { isAbsolute, relative, resolve, sep } from "node:path";

declare const keyOutPathBrand: unique symbol;

/** An absolute path for the deploy key that lies outside the repo, so the key can't be committed. */
export type KeyOutPath = string & { readonly [keyOutPathBrand]: true };

function isInside(root: string, path: string): boolean {
  const from = relative(root, path);
  return from === "" || (from !== ".." && !from.startsWith(".." + sep) && !isAbsolute(from));
}

/** Whether `value` is absolute and outside `repoRoot`. */
export function isKeyOutPath(value: string, repoRoot: string): value is KeyOutPath {
  return isAbsolute(value) && !isInside(resolve(repoRoot), resolve(value));
}

/** Resolves `value` against the working directory, or throws if it lands inside `repoRoot`. */
export function keyOutPath(value: string, repoRoot: string): KeyOutPath {
  const absolute = resolve(value);
  if (!isKeyOutPath(absolute, repoRoot)) {
    throw new Error(`--key-out must be outside the repo, so the key can't be committed: ${value}`);
  }
  return absolute;
}
