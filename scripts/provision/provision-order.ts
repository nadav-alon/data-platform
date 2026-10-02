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
import { z } from "zod";
import type { ProvisionRunArgs } from "./parse-args.ts";
import { isWebAppId } from "./web-app-id.ts";

export const LOGIN_COMMAND = "npx firebase login";

/** Runs a command and returns its stdout; throws if it exits non-zero. */
export type RunCommand = (command: Command) => string;

export type ProvisionDeps = {
  readonly run: RunCommand;
  readonly print: (line: string) => void;
};

const projectSchema = z.object({ projectId: z.string() });
const databaseSchema = z.object({ name: z.string() });
const webAppSchema = z.object({
  appId: z.string().refine(isWebAppId),
  displayName: z.string().optional(),
});

/** The `result` array of a Firebase CLI `--json` reply, each element checked against `element`. */
function jsonResult<T extends z.ZodType>(output: string, element: T): z.output<T>[] {
  const reply = z.object({ result: z.array(element).default([]) }).parse(JSON.parse(output));
  return reply.result;
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
  { project, location }: Omit<ProvisionRunArgs, "kind">,
  { run, print }: ProvisionDeps,
): void {
  if (!isLoggedIn(run(loginListCommand()))) {
    throw new Error(`The Firebase CLI is not logged in. Run: ${LOGIN_COMMAND}`);
  }

  const hasProject = jsonResult(run(listProjectsCommand()), projectSchema).some(
    (p) => p.projectId === project,
  );
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

  const hasDatabase = jsonResult(run(listFirestoreDatabasesCommand(project)), databaseSchema).some(
    (db) => db.name.endsWith("/databases/(default)"),
  );
  if (hasDatabase) {
    print("firestore: already there");
  } else {
    run(createFirestoreCommand(project, location));
    print(`firestore: created in ${location}`);
  }

  const findApp = () =>
    jsonResult(run(listWebAppsCommand(project)), webAppSchema).find(
      (app) => app.displayName === project,
    );
  let app = findApp();
  if (app) {
    print(`web app ${project}: already there`);
  } else {
    run(createWebAppCommand(project));
    print(`web app ${project}: created`);
    app = findApp();
  }
  if (app === undefined) {
    throw new Error(`Could not find the web app ${project} after registering it`);
  }

  print(run(sdkConfigCommand(project, app.appId)));
}
