import { z } from "zod";
// https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
/** A semver version string, e.g. the version each deploy writes to `meta/platform`. */
const semverSchema = z.string().regex(SEMVER_PATTERN).brand();
export function isSemver(value) {
    return semverSchema.safeParse(value).success;
}
export function semver(value) {
    const result = semverSchema.safeParse(value);
    if (!result.success) {
        throw new Error(`Not a Semver: ${JSON.stringify(value)}`);
    }
    return result.data;
}
/** The major version, e.g. `2` for `2.0.0`. */
export function semverMajor(value) {
    return Number(value.split(".")[0]);
}
export { semverSchema };
