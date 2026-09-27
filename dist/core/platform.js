import { z } from "zod";
import packageJson from "../../package.json" with { type: "json" };
import { semver, semverMajor, semverSchema } from "./semver.js";
/** Written by each household deploy; apps compare it against their own version. */
export const PLATFORM_DOC_PATH = "meta/platform";
export const platformMetaSchema = z.object({
    version: semverSchema,
});
/** The platform version this build requires, from `package.json`: the default `required` for `checkPlatform`. */
export const PLATFORM_VERSION = semver(packageJson.version);
/** Compares a deployed `meta/platform` version against the version an app requires. */
export function checkPlatform(deployed, required = PLATFORM_VERSION) {
    if (deployed === undefined) {
        return "missing";
    }
    return semverMajor(deployed) < semverMajor(required) ? "outdated" : "ok";
}
