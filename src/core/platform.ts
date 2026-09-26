import { z } from "zod";
import packageJson from "../../package.json" with { type: "json" };
import { semver, semverMajor, semverSchema, type Semver } from "./semver.ts";

/** Written by each household deploy; apps compare it against their own version. */
export const PLATFORM_DOC_PATH = "meta/platform";

export const platformMetaSchema = z.object({
  version: semverSchema,
});

export type PlatformMeta = z.infer<typeof platformMetaSchema>;

/**
 * `ok`: the deployed platform's major supports `required`. `outdated`: the household hasn't
 * deployed a platform major new enough for `required` yet. `missing`: nothing has deployed
 * `meta/platform` at all.
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
  return semverMajor(deployed) < semverMajor(required) ? "outdated" : "ok";
}
