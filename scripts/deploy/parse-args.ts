import { firebaseProjectId, type FirebaseProjectId } from "./project-id.ts";

/** Reads `--project <id>` out of CLI args, e.g. `process.argv.slice(2)`. */
export function parseProjectId(args: readonly string[]): FirebaseProjectId {
  const index = args.indexOf("--project");
  const value = index === -1 ? undefined : args[index + 1];
  if (value === undefined) {
    throw new Error("Usage: --project <id>");
  }
  return firebaseProjectId(value);
}
