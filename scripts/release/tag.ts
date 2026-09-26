import { type PackageVersion } from "./version.ts";

declare const releaseTagBrand: unique symbol;

/** A git tag naming a release: `v` followed by the released `PackageVersion`. */
export type ReleaseTag = string & { readonly [releaseTagBrand]: true };

export function releaseTagFor(version: PackageVersion): ReleaseTag {
  return `v${version}` as ReleaseTag;
}

/**
 * The tag this version should release under, or `null` if that tag already
 * exists — the version hasn't changed since the last release.
 */
export function pendingReleaseTag(
  version: PackageVersion,
  existingTags: readonly string[],
): ReleaseTag | null {
  const tag = releaseTagFor(version);
  return existingTags.includes(tag) ? null : tag;
}
