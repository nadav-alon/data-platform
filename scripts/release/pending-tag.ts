import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { packageVersion, type PackageVersion } from "./version.ts";
import { isReleaseTag, releaseDecision } from "./tag.ts";

function versionFromPackageJson(json: string): PackageVersion {
  const { version } = JSON.parse(json) as { version: unknown };
  if (typeof version !== "string") {
    throw new Error(`package.json has no string "version": ${JSON.stringify(version)}`);
  }
  return packageVersion(version);
}

// null when there is no previous commit to compare against, or it carried no
// package.json — the first release, which tags without a version bump commit
// of its own (RELEASING.md).
function previousVersion(): PackageVersion | null {
  let json: string;
  try {
    json = execFileSync("git", ["show", "HEAD^:package.json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
  return versionFromPackageJson(json);
}

const version = versionFromPackageJson(readFileSync("package.json", "utf8"));

const existingTags = execFileSync("git", ["tag", "-l"], { encoding: "utf8" })
  .split("\n")
  .filter(isReleaseTag);

const decision = releaseDecision(version, previousVersion(), existingTags);

switch (decision.kind) {
  case "tag":
    process.stdout.write(decision.tag);
    break;
  case "up-to-date":
    break;
  case "missing":
    throw new Error(
      `Release tag ${decision.tag} is missing, but this push didn't change the version — refusing to ` +
        `release this tree under it. Re-create ${decision.tag} by hand if it should point here, or leave ` +
        `it to the version-bump push once one lands.`,
    );
}
