import { z } from "zod";

// https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/** A semver version string, e.g. the version each deploy writes to `meta/platform`. */
const semverSchema = z.string().regex(SEMVER_PATTERN).brand<"Semver">();

export type Semver = z.infer<typeof semverSchema>;

export function isSemver(value: string): value is Semver {
  return semverSchema.safeParse(value).success;
}

export function semver(value: string): Semver {
  const result = semverSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Not a Semver: ${JSON.stringify(value)}`);
  }
  return result.data;
}

/** The major version, e.g. `2` for `2.0.0`. */
export function semverMajor(value: Semver): number {
  return Number(value.split(".")[0]);
}

/** The minor version, e.g. `1` for `2.1.0`. */
export function semverMinor(value: Semver): number {
  return Number(value.split(".")[1]);
}

export { semverSchema };
