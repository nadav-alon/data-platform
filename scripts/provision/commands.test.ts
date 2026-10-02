import { test } from "node:test";
import assert from "node:assert/strict";
import { firebaseProjectId } from "../deploy/project-id.ts";
import { firestoreLocation } from "./firestore-location.ts";
import { keyOutPath as keyOut } from "./key-out-path.ts";
import { serviceAccountEmail } from "./service-account-email.ts";
import { webAppId } from "./web-app-id.ts";
import {
  addFirebaseCommand,
  addRoleCommand,
  getIamPolicyCommand,
  listServiceAccountsCommand,
  createFirestoreCommand,
  createKeyCommand,
  createProjectCommand,
  createWebAppCommand,
  gcloudActiveAccountCommand,
  gcloudVersionCommand,
  listFirestoreDatabasesCommand,
  listProjectsCommand,
  listWebAppsCommand,
  loginListCommand,
  sdkConfigCommand,
} from "./commands.ts";

const project = firebaseProjectId("my-household-42");
const account = serviceAccountEmail("firebase-adminsdk-abc12@my-household-42.iam.gserviceaccount.com");

function line(command: { file: string; args: readonly string[] }): string {
  return [command.file, ...command.args].join(" ");
}

test("login check lists the CLI's accounts", () => {
  assert.equal(line(loginListCommand()), "npx firebase login:list");
});

test("project creation names the project and its display name after the id", () => {
  assert.equal(
    line(createProjectCommand(project)),
    "npx firebase projects:create my-household-42 --display-name my-household-42",
  );
});

test("project lookup asks for JSON", () => {
  assert.equal(line(listProjectsCommand()), "npx firebase projects:list --json");
});

test("Firestore creation targets the default database at the location", () => {
  assert.equal(
    line(createFirestoreCommand(project, firestoreLocation("eur3"))),
    "npx firebase firestore:databases:create (default) --location eur3 --project my-household-42",
  );
});

test("Firestore lookup is scoped to the project", () => {
  assert.equal(
    line(listFirestoreDatabasesCommand(project)),
    "npx firebase firestore:databases:list --project my-household-42 --json",
  );
});

test("web app registration is named after the project id", () => {
  assert.equal(
    line(createWebAppCommand(project)),
    "npx firebase apps:create WEB my-household-42 --project my-household-42",
  );
});

test("web app lookup lists WEB apps as JSON", () => {
  assert.equal(
    line(listWebAppsCommand(project)),
    "npx firebase apps:list WEB --project my-household-42 --json",
  );
});

test("the snippet is read for one app id", () => {
  assert.equal(
    line(sdkConfigCommand(project, webAppId("1:123:web:abc"))),
    "npx firebase apps:sdkconfig WEB 1:123:web:abc --project my-household-42",
  );
});

test("adding Firebase to an existing Cloud project names the project", () => {
  assert.equal(
    line(addFirebaseCommand(project)),
    "npx firebase projects:addfirebase my-household-42",
  );
});

test("the gcloud install check asks for its version", () => {
  assert.equal(line(gcloudVersionCommand()), "gcloud --version");
});

test("the gcloud login check lists the active account", () => {
  assert.equal(
    line(gcloudActiveAccountCommand()),
    "gcloud auth list --filter=status:ACTIVE --format=value(account)",
  );
});

test("service accounts are listed for the project as JSON", () => {
  assert.equal(
    line(listServiceAccountsCommand(project)),
    "gcloud iam service-accounts list --project my-household-42 --format=json",
  );
});

test("the IAM policy is read for the project as JSON", () => {
  assert.equal(
    line(getIamPolicyCommand(project)),
    "gcloud projects get-iam-policy my-household-42 --format=json",
  );
});

test("a role is bound to the service account with no condition", () => {
  assert.equal(
    line(addRoleCommand(project, account, "roles/firebaserules.admin")),
    "gcloud projects add-iam-policy-binding my-household-42 --member serviceAccount:firebase-adminsdk-abc12@my-household-42.iam.gserviceaccount.com --role roles/firebaserules.admin --condition=None",
  );
});

test("a key is created for the service account at the path", () => {
  assert.equal(
    line(createKeyCommand(project, account, keyOut("/home/me/key.json", "/repo"))),
    "gcloud iam service-accounts keys create /home/me/key.json --iam-account firebase-adminsdk-abc12@my-household-42.iam.gserviceaccount.com --project my-household-42",
  );
});
