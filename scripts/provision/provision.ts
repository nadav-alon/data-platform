import { statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { HELP } from "./help.ts";
import { parseProvisionArgs } from "./parse-args.ts";
import { provision } from "./provision-order.ts";

/** A directory at the key path is not a key: it counts as absent, so key creation fails loudly. */
function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

const args = parseProvisionArgs(process.argv.slice(2));

if (args.kind === "help") {
  console.log(HELP);
} else {
  provision(args, {
    run: ({ file, args: commandArgs }) =>
      execFileSync(file, [...commandArgs], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }),
    exists: isFile,
    print: console.log,
  });
}
