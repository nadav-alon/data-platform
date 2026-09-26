import { z } from "zod";
import { semverSchema } from "./semver.ts";

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

/** Compares a deployed `meta/platform` version against the version an app requires. */
export function checkPlatform(deployed: string | undefined, required: string): PlatformCheck {
  if (deployed === undefined) {
    return "missing";
  }
  return major(deployed) < major(required) ? "outdated" : "ok";
}

function major(version: string): number {
  return Number(version.split(".")[0]);
}
