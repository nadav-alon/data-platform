import { test } from "node:test";
import assert from "node:assert/strict";
import { firebaseProjectId } from "../deploy/project-id.ts";
import { firestoreLocation } from "./firestore-location.ts";
import {
  createFirestoreCommand,
  createProjectCommand,
  createWebAppCommand,
  listFirestoreDatabasesCommand,
  listProjectsCommand,
  listWebAppsCommand,
  loginListCommand,
  sdkConfigCommand,
} from "./commands.ts";

const project = firebaseProjectId("my-household-42");

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
    line(sdkConfigCommand(project, "1:123:web:abc")),
    "npx firebase apps:sdkconfig WEB 1:123:web:abc --project my-household-42",
  );
});
