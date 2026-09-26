import { type PackageVersion } from "./version.ts";

declare const releaseTagBrand: unique symbol;

/** A git tag naming a release: `v` followed by the released `PackageVersion`. */
export type ReleaseTag = string & { readonly [releaseTagBrand]: true };

const RELEASE_TAG_PATTERN = /^v\d+\.\d+\.\d+$/;

export function isReleaseTag(value: string): value is ReleaseTag {
  return RELEASE_TAG_PATTERN.test(value);
}

export function releaseTag(value: string): ReleaseTag {
  if (!isReleaseTag(value)) {
    throw new Error(`Not a release tag (expected v<version>): ${value}`);
  }
  return value;
}

export function tagForVersion(version: PackageVersion): ReleaseTag {
  return releaseTag(`v${version}`);
}

/**
 * The tag this version should release under, or `null` if that tag already
 * exists — the version hasn't changed since the last release.
 */
export function pendingReleaseTag(
  version: PackageVersion,
  existingTags: readonly ReleaseTag[],
): ReleaseTag | null {
  const tag = tagForVersion(version);
  return existingTags.includes(tag) ? null : tag;
}
