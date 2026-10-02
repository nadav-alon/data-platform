import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { HELP } from "./help.ts";
import { parseProvisionArgs } from "./parse-args.ts";
import { provision } from "./provision-order.ts";

const args = parseProvisionArgs(process.argv.slice(2));

if (args.kind === "help") {
  console.log(HELP);
} else {
  provision(args, {
    run: ({ file, args: commandArgs }) =>
      execFileSync(file, [...commandArgs], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }),
    exists: existsSync,
    print: console.log,
  });
}
