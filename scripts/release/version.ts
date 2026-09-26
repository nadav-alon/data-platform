declare const packageVersionBrand: unique symbol;

/** A `package.json` version: `major.minor.patch`, no pre-release or build metadata. */
export type PackageVersion = string & { readonly [packageVersionBrand]: true };

const PACKAGE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function isPackageVersion(value: string): value is PackageVersion {
  return PACKAGE_VERSION_PATTERN.test(value);
}

export function packageVersion(value: string): PackageVersion {
  if (!isPackageVersion(value)) {
    throw new Error(`Not a package version (expected major.minor.patch): ${value}`);
  }
  return value;
}
