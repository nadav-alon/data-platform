import { z } from "zod";
import packageJson from "../../package.json" with { type: "json" };
import { semver, semverMajor, semverMinor, semverSchema, type Semver } from "./semver.ts";

/** Written by each household deploy; apps check it with `checkPlatform` against the platform version they were built against. */
export const PLATFORM_DOC_PATH = "meta/platform";

export const platformMetaSchema = z.object({
  version: semverSchema,
});

export type PlatformMeta = z.infer<typeof platformMetaSchema>;

/**
 * `ok`: the deployed platform's breaking digit (the major, or pre-1.0 the minor) supports
 * `required`. `outdated`: the household hasn't deployed a platform new enough for `required`
 * yet. `missing`: nothing has deployed `meta/platform` at all.
 */
export type PlatformCheck = "ok" | "outdated" | "missing";

/** The platform version this build requires, from `package.json`: the default `required` for `checkPlatform`. */
export const PLATFORM_VERSION = semver(packageJson.version);

/** Compares a deployed `meta/platform` version against the version an app requires. */
export function checkPlatform(
  deployed: Semver | undefined,
  required: Semver = PLATFORM_VERSION,
): PlatformCheck {
  if (deployed === undefined) {
    return "missing";
  }
  const deployedMajor = semverMajor(deployed);
  const requiredMajor = semverMajor(required);
  if (deployedMajor !== requiredMajor) {
    return deployedMajor < requiredMajor ? "outdated" : "ok";
  }
  // Pre-1.0, the API has no stable shape yet, so semver moves the breaking digit from the
  // major (pinned at 0) down to the minor.
  if (requiredMajor === 0) {
    return semverMinor(deployed) < semverMinor(required) ? "outdated" : "ok";
  }
  return "ok";
}
