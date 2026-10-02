import type { FirebaseProjectId } from "../deploy/project-id.ts";
import type { FirestoreLocation } from "./firestore-location.ts";
import type { WebAppId } from "./web-app-id.ts";

/** A process to spawn: the file and its arguments, never a shell string. */
export type Command = { readonly file: string; readonly args: readonly string[] };

/** Runs the repo's own Firebase CLI, which `npm ci` installs as a dev dependency. */
function firebase(...args: readonly string[]): Command {
  return { file: "npx", args: ["firebase", ...args] };
}

export function loginListCommand(): Command {
  return firebase("login:list");
}

export function listProjectsCommand(): Command {
  return firebase("projects:list", "--json");
}

/** Creates the Google Cloud project and adds Firebase to it. */
export function createProjectCommand(project: FirebaseProjectId): Command {
  return firebase("projects:create", project, "--display-name", project);
}

/** Adds Firebase to a Google Cloud project that already exists. */
export function addFirebaseCommand(project: FirebaseProjectId): Command {
  return firebase("projects:addfirebase", project);
}

export function listFirestoreDatabasesCommand(project: FirebaseProjectId): Command {
  return firebase("firestore:databases:list", "--project", project, "--json");
}

/** Creates the `(default)` database in production mode. */
export function createFirestoreCommand(
  project: FirebaseProjectId,
  location: FirestoreLocation,
): Command {
  return firebase(
    "firestore:databases:create",
    "(default)",
    "--location",
    location,
    "--project",
    project,
  );
}

export function listWebAppsCommand(project: FirebaseProjectId): Command {
  return firebase("apps:list", "WEB", "--project", project, "--json");
}

/** Registers a web app whose display name is the project id. */
export function createWebAppCommand(project: FirebaseProjectId): Command {
  return firebase("apps:create", "WEB", project, "--project", project);
}

export function sdkConfigCommand(project: FirebaseProjectId, appId: WebAppId): Command {
  return firebase("apps:sdkconfig", "WEB", appId, "--project", project);
}
