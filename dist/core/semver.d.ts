import { z } from "zod";
/** A semver version string, e.g. the version each deploy writes to `meta/platform`. */
declare const semverSchema: z.core.$ZodBranded<z.ZodString, "Semver", "out">;
export type Semver = z.infer<typeof semverSchema>;
export declare function isSemver(value: string): value is Semver;
export declare function semver(value: string): Semver;
/** The major version, e.g. `2` for `2.0.0`. */
export declare function semverMajor(value: Semver): number;
export { semverSchema };
