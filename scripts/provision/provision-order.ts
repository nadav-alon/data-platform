import {
  addFirebaseCommand,
  createFirestoreCommand,
  createProjectCommand,
  createWebAppCommand,
  listFirestoreDatabasesCommand,
  listProjectsCommand,
  listWebAppsCommand,
  loginListCommand,
  sdkConfigCommand,
  type Command,
} from "./commands.ts";
import type { FirebaseProjectId } from "../deploy/project-id.ts";
import type { FirestoreLocation } from "./firestore-location.ts";

export const LOGIN_COMMAND = "npx firebase login";

/** Runs a command and returns its stdout; throws if it exits non-zero. */
export type RunCommand = (command: Command) => string;

export type ProvisionDeps = {
  readonly run: RunCommand;
  readonly print: (line: string) => void;
};

/** The `result` array of a Firebase CLI `--json` reply. */
function jsonResult(output: string): readonly Record<string, unknown>[] {
  const parsed: unknown = JSON.parse(output);
  const result = (parsed as { result?: unknown } | null)?.result;
  return Array.isArray(result) ? result : [];
}

function isLoggedIn(loginList: string): boolean {
  return !/no authorized accounts/i.test(loginList);
}

/**
 * Provisions a Household's project, Firestore database and web app, skipping any step already
 * done and printing one line per step. The login check runs first, so a logged-out CLI stops the
 * run before anything changes. Prints the web app's SDK config snippet last, whether or not the
 * app was just created.
 */
export function provision(
  { project, location }: { project: FirebaseProjectId; location: FirestoreLocation },
  { run, print }: ProvisionDeps,
): void {
  if (!isLoggedIn(run(loginListCommand()))) {
    throw new Error(`The Firebase CLI is not logged in. Run: ${LOGIN_COMMAND}`);
  }

  const hasProject = jsonResult(run(listProjectsCommand())).some((p) => p.projectId === project);
  if (hasProject) {
    print(`project ${project}: already there`);
  } else {
    try {
      run(createProjectCommand(project));
      print(`project ${project}: created`);
    } catch (createError) {
      // `projects:create` makes the Cloud project, then adds Firebase to it. When the second part
      // failed on an earlier run, the Cloud project exists but `projects:list` doesn't show it.
      try {
        run(addFirebaseCommand(project));
      } catch {
        throw createError;
      }
      print(`project ${project}: Firebase added`);
    }
  }

  const hasDatabase = jsonResult(run(listFirestoreDatabasesCommand(project))).some(
    (db) => typeof db.name === "string" && db.name.endsWith("/databases/(default)"),
  );
  if (hasDatabase) {
    print("firestore: already there");
  } else {
    run(createFirestoreCommand(project, location));
    print(`firestore: created in ${location}`);
  }

  const findApp = () =>
    jsonResult(run(listWebAppsCommand(project))).find((app) => app.displayName === project);
  let app = findApp();
  if (app) {
    print(`web app ${project}: already there`);
  } else {
    run(createWebAppCommand(project));
    print(`web app ${project}: created`);
    app = findApp();
  }
  if (typeof app?.appId !== "string") {
    throw new Error(`Could not find the web app ${project} after registering it`);
  }

  print(run(sdkConfigCommand(project, app.appId)));
}
