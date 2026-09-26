import { z } from "zod";
import { semverSchema } from "./semver.ts";

/** Written by each household deploy; the version guard (#8) compares this against the app's own. */
export const PLATFORM_DOC_PATH = "meta/platform";

export const platformMetaSchema = z.object({
  version: semverSchema,
});

export type PlatformMeta = z.infer<typeof platformMetaSchema>;
