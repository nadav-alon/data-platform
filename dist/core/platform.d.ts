import { z } from "zod";
import { type Semver } from "./semver.ts";
/** Written by each household deploy; apps check it with `checkPlatform` against the platform version they were built against. */
export declare const PLATFORM_DOC_PATH = "meta/platform";
export declare const platformMetaSchema: z.ZodObject<{
    version: z.core.$ZodBranded<z.ZodString, "Semver", "out">;
}, z.core.$strip>;
export type PlatformMeta = z.infer<typeof platformMetaSchema>;
/**
 * `ok`: the deployed platform's breaking digit (the major, or pre-1.0 the minor) supports
 * `required`. `outdated`: the household hasn't deployed a platform new enough for `required`
 * yet. `missing`: nothing has deployed `meta/platform` at all.
 */
export type PlatformCheck = "ok" | "outdated" | "missing";
/** The platform version this build requires, from `package.json`: the default `required` for `checkPlatform`. */
export declare const PLATFORM_VERSION: string & z.$brand<"Semver">;
/** Compares a deployed `meta/platform` version against the version an app requires. */
export declare function checkPlatform(deployed: Semver | undefined, required?: Semver): PlatformCheck;
