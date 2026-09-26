import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { packageVersion } from "./version.ts";
import { isReleaseTag, pendingReleaseTag } from "./tag.ts";

const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: unknown };
if (typeof version !== "string") {
  throw new Error(`package.json has no string "version": ${JSON.stringify(version)}`);
}

const existingTags = execFileSync("git", ["tag", "-l"], { encoding: "utf8" })
  .split("\n")
  .filter(isReleaseTag);

const tag = pendingReleaseTag(packageVersion(version), existingTags);
if (tag !== null) {
  process.stdout.write(tag);
}
