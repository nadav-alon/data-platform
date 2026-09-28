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

// The all-zeros SHA GitHub sends as `github.event.before` for a push that
// creates a branch: there is no commit before it to compare against.
const ZERO_SHA = "0000000000000000000000000000000000000000";

// null when there is no push before this one, or it carried no package.json —
// the first release, which tags without a version bump commit of its own
// (RELEASING.md). Anything else that keeps `git` from reading that commit's
// package.json is a real failure and throws, rather than silently falling
// back to the first-release case.
function previousVersion(): PackageVersion | null {
  const before = process.env.BEFORE_SHA;
  if (!before) {
    throw new Error("BEFORE_SHA is not set");
  }
  if (before === ZERO_SHA) {
    return null;
  }
  // Throws if `before` itself doesn't resolve to a commit.
  execFileSync("git", ["cat-file", "-e", `${before}^{commit}`], { stdio: "ignore" });
  try {
    execFileSync("git", ["cat-file", "-e", `${before}:package.json`], { stdio: "ignore" });
  } catch {
    return null;
  }
  const json = execFileSync("git", ["show", `${before}:package.json`], { encoding: "utf8" });
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
