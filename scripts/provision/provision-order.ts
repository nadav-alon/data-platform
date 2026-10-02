import {
  addFirebaseCommand,
  addRoleCommand,
  createFirestoreCommand,
  createKeyCommand,
  createProjectCommand,
  createWebAppCommand,
  gcloudActiveAccountCommand,
  gcloudVersionCommand,
  getIamPolicyCommand,
  listFirestoreDatabasesCommand,
  listProjectsCommand,
  listServiceAccountsCommand,
  listWebAppsCommand,
  loginListCommand,
  sdkConfigCommand,
  type Command,
} from "./commands.ts";
import { z } from "zod";
import type { FirebaseProjectId } from "../deploy/project-id.ts";
import type { KeyOutPath } from "./key-out-path.ts";
import type { ProvisionRunArgs } from "./parse-args.ts";
import { DEPLOY_ROLES } from "./role-id.ts";
import { serviceAccountEmail, type ServiceAccountEmail } from "./service-account-email.ts";
import { isWebAppId } from "./web-app-id.ts";

export const LOGIN_COMMAND = "npx firebase login";
export const GCLOUD_INSTALL_URL = "https://cloud.google.com/sdk/docs/install";
export const GCLOUD_LOGIN_COMMAND = "gcloud auth login";

/** Runs a command and returns its stdout; throws if it exits non-zero. */
export type RunCommand = (command: Command) => string;

export type ProvisionDeps = {
  readonly run: RunCommand;
  /** Whether a regular file sits at `path`. */
  readonly exists: (path: string) => boolean;
  readonly print: (line: string) => void;
};

const projectSchema = z.object({ projectId: z.string() });
const databaseSchema = z.object({ name: z.string() });
const serviceAccountSchema = z.object({ email: z.string() });
const iamPolicySchema = z.object({
  bindings: z.array(z.object({ role: z.string(), members: z.array(z.string()) })).default([]),
});
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

/** Stops, naming the fix, unless `gcloud` is installed and has an active account. */
function requireGcloud(run: RunCommand): void {
  try {
    run(gcloudVersionCommand());
  } catch {
    throw new Error(`The gcloud CLI is not installed. Install it: ${GCLOUD_INSTALL_URL}`);
  }
  if (run(gcloudActiveAccountCommand()).trim() === "") {
    throw new Error(`The gcloud CLI is not logged in. Run: ${GCLOUD_LOGIN_COMMAND}`);
  }
}

/**
 * The `firebase-adminsdk-…` service account Firebase created with the project. Other accounts the
 * project lists, such as the App Engine or Compute defaults, are ignored whatever their domain.
 */
function findDeployAccount(run: RunCommand, project: FirebaseProjectId): ServiceAccountEmail {
  const account = z.array(serviceAccountSchema).parse(JSON.parse(run(listServiceAccountsCommand(project)))).find(
    ({ email }) => email.startsWith("firebase-adminsdk-"),
  );
  if (account === undefined) {
    throw new Error(`Could not find the firebase-adminsdk service account of ${project}`);
  }
  return serviceAccountEmail(account.email);
}

/** Binds each deploy role to the account unless the project's IAM policy already has it. */
function grantRoles(
  { run, print }: ProvisionDeps,
  project: FirebaseProjectId,
  account: ServiceAccountEmail,
): void {
  const policy = iamPolicySchema.parse(JSON.parse(run(getIamPolicyCommand(project))));
  for (const { name, id } of DEPLOY_ROLES) {
    const granted = policy.bindings.some(
      (binding) => binding.role === id && binding.members.includes(`serviceAccount:${account}`),
    );
    if (granted) {
      print(`role ${name}: already there`);
    } else {
      run(addRoleCommand(project, account, id));
      print(`role ${name}: granted`);
    }
  }
}

/** Writes the deploy key to `path` unless a file is already there, which is never overwritten. */
function createKey(
  { run, print, exists }: ProvisionDeps,
  project: FirebaseProjectId,
  account: ServiceAccountEmail,
  path: KeyOutPath,
): void {
  if (exists(path)) {
    print(`key ${path}: already there`);
  } else {
    run(createKeyCommand(project, account, path));
    print(`key ${path}: created`);
  }
}

/**
 * Provisions a Household's project, Firestore database and web app, skipping any step already
 * done and printing one line per step. The login check runs first, so a logged-out CLI stops the
 * run before anything changes. Prints the web app's SDK config snippet last, whether or not the
 * app was just created.
 */
export function provision(
  { project, location, keyOut }: Omit<ProvisionRunArgs, "kind">,
  deps: ProvisionDeps,
): void {
  const { run, print } = deps;
  if (!isLoggedIn(run(loginListCommand()))) {
    throw new Error(`The Firebase CLI is not logged in. Run: ${LOGIN_COMMAND}`);
  }
  if (keyOut !== undefined) {
    requireGcloud(run);
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

  if (keyOut !== undefined) {
    const account = findDeployAccount(run, project);
    grantRoles(deps, project, account);
    createKey(deps, project, account, keyOut);
  }

  print(run(sdkConfigCommand(project, app.appId)));
}
