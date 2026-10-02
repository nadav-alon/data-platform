import { firebaseProjectId, type FirebaseProjectId } from "../deploy/project-id.ts";
import { firestoreLocation, type FirestoreLocation } from "./firestore-location.ts";

/** What a provisioning run needs: both inputs are required, with no defaults. */
export type ProvisionRunArgs = {
  readonly kind: "run";
  readonly project: FirebaseProjectId;
  readonly location: FirestoreLocation;
};

export type ProvisionArgs = { readonly kind: "help" } | ProvisionRunArgs;

const USAGE = "Usage: --project <id> --location <location>  (see --help)";

function flagValue(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag);
  const value = index === -1 ? undefined : args[index + 1];
  if (value === undefined) {
    throw new Error(USAGE);
  }
  return value;
}

/** Reads `--project <id>` and `--location <loc>`, both required, or `--help`, out of CLI args. */
export function parseProvisionArgs(args: readonly string[]): ProvisionArgs {
  if (args.includes("--help")) {
    return { kind: "help" };
  }
  return {
    kind: "run",
    project: firebaseProjectId(flagValue(args, "--project")),
    location: firestoreLocation(flagValue(args, "--location")),
  };
}
