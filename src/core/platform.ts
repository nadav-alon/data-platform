import { readFileSync } from "node:fs";
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

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version: unknown };
if (typeof packageJson.version !== "string") {
  throw new Error(`package.json has no string "version": ${JSON.stringify(packageJson.version)}`);
}

/** This package's own version, from `package.json`: the default `required` for `checkPlatform`. */
export const PACKAGE_VERSION = packageJson.version;

/** Compares a deployed `meta/platform` version against the version an app requires. */
export function checkPlatform(
  deployed: string | undefined,
  required: string = PACKAGE_VERSION,
): PlatformCheck {
  if (deployed === undefined) {
    return "missing";
  }
  return major(deployed) < major(required) ? "outdated" : "ok";
}

function major(version: string): number {
  return Number(version.split(".")[0]);
}
