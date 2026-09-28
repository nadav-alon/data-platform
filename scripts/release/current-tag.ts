import { readFileSync } from "node:fs";
import { packageVersion } from "./version.ts";
import { tagForVersion } from "./tag.ts";

const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: unknown };
if (typeof version !== "string") {
  throw new Error(`package.json has no string "version": ${JSON.stringify(version)}`);
}

process.stdout.write(tagForVersion(packageVersion(version)));
