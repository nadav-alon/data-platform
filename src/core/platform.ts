import { z } from "zod";
import { semverSchema } from "./semver.ts";

/** Written by each household deploy; apps compare it against their own version. */
export const PLATFORM_DOC_PATH = "meta/platform";

// TODO[#8]: add the version guard that compares this against the app's own major.
export const platformMetaSchema = z.object({
  version: semverSchema,
});

export type PlatformMeta = z.infer<typeof platformMetaSchema>;
