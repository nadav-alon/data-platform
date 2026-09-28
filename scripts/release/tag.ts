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

export type ReleaseDecision =
  | { readonly kind: "tag"; readonly tag: ReleaseTag }
  | { readonly kind: "up-to-date" }
  | { readonly kind: "refuse"; readonly tag: ReleaseTag };

/**
 * What a push to `main` should do about the release tag: `tag` it (this push
 * is the one that changed `version`), do nothing (`up-to-date`, the normal
 * case once a version has released), or `refuse` — the tag doesn't exist but
 * this push didn't change `version` either, so tagging here would release a
 * tree the version bump never contained.
 */
export function releaseDecision(
  version: PackageVersion,
  previousVersion: PackageVersion | null,
  existingTags: readonly ReleaseTag[],
): ReleaseDecision {
  const tag = tagForVersion(version);
  if (existingTags.includes(tag)) {
    return { kind: "up-to-date" };
  }
  return previousVersion === version ? { kind: "refuse", tag } : { kind: "tag", tag };
}
