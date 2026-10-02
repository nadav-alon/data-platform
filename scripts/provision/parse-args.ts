import { fileURLToPath } from "node:url";
import { firebaseProjectId, type FirebaseProjectId } from "../deploy/project-id.ts";
import { firestoreLocation, type FirestoreLocation } from "./firestore-location.ts";
import { keyOutPath, type KeyOutPath } from "./key-out-path.ts";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/**
 * What a provisioning run needs: project and location are required, with no defaults. Without
 * `keyOut` the deploy key steps are skipped.
 */
export type ProvisionRunArgs = {
  readonly kind: "run";
  readonly project: FirebaseProjectId;
  readonly location: FirestoreLocation;
  readonly keyOut?: KeyOutPath;
};

export type ProvisionArgs = { readonly kind: "help" } | ProvisionRunArgs;

const USAGE = "Usage: --project <id> --location <location> [--key-out <path>]  (see --help)";

function flagValue(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag);
  const value = index === -1 ? undefined : args[index + 1];
  if (value === undefined) {
    throw new Error(USAGE);
  }
  return value;
}

/**
 * Reads `--project <id>` and `--location <loc>`, both required, the optional `--key-out <path>`,
 * or `--help`, out of CLI args. The key path must lie outside `repoRoot`.
 */
export function parseProvisionArgs(
  args: readonly string[],
  repoRoot: string = REPO_ROOT,
): ProvisionArgs {
  if (args.includes("--help")) {
    return { kind: "help" };
  }
  const run = {
    kind: "run" as const,
    project: firebaseProjectId(flagValue(args, "--project")),
    location: firestoreLocation(flagValue(args, "--location")),
  };
  return args.includes("--key-out")
    ? { ...run, keyOut: keyOutPath(flagValue(args, "--key-out"), repoRoot) }
    : run;
}
