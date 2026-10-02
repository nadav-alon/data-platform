import { test } from "node:test";
import assert from "node:assert/strict";
import { firebaseProjectId } from "../deploy/project-id.ts";
import { firestoreLocation } from "./firestore-location.ts";
import type { Command } from "./commands.ts";
import { keyOutPath } from "./key-out-path.ts";
import { provision } from "./provision-order.ts";
import { serviceAccountEmail } from "./service-account-email.ts";

const project = firebaseProjectId("my-household-42");
const location = firestoreLocation("eur3");
const account = serviceAccountEmail(`firebase-adminsdk-abc12@${project}.iam.gserviceaccount.com`);
const keyOut = keyOutPath("/home/me/key.json", "/repo");

type World = {
  loggedIn: boolean;
  project: boolean;
  database: boolean;
  app: boolean;
  /** A Cloud project without Firebase: `projects:create` fails on it, `projects:addfirebase` fixes it. */
  cloudOnly?: boolean;
  /** The Google Cloud CLI: absent from the machine, installed but logged out, or ready. */
  gcloud?: "missing" | "logged-out" | "ready";
  /** Role ids bound to the deploy service account. */
  roles?: string[];
  /** Role ids bound to the deploy service account only under a condition. */
  conditionalRoles?: string[];
  /** Whether a file already sits at the key path. */
  keyFile?: boolean;
};

/** A fake Firebase CLI over `world`, recording every call and mutating on creates. */
function harness(world: World) {
  const calls: string[] = [];
  const printed: string[] = [];
  const keys: string[] = [];
  const run = (command: Command): string => {
    if (command.file === "gcloud") {
      calls.push(`gcloud ${command.args[0]}`);
      if (world.gcloud === "missing") throw new Error("spawn gcloud ENOENT");
      switch (command.args[0]) {
        case "--version":
          return "Google Cloud SDK";
        case "auth":
          return world.gcloud === "logged-out" ? "" : "user@example.com\n";
        case "iam":
          if (command.args[2] === "keys") {
            keys.push(command.args[4]);
            return "";
          }
          return JSON.stringify([
            { email: `${project}@appspot.gserviceaccount.com` },
            { email: "123456-compute@developer.gserviceaccount.com" },
            { email: account },
          ]);
        case "projects": {
          const roles = (world.roles ??= []);
          if (command.args[1] === "get-iam-policy") {
            return JSON.stringify({
              bindings: [
                { role: "roles/owner", members: ["user:me@example.com"] },
                ...roles.map((role) => ({ role, members: [`serviceAccount:${account}`] })),
                ...(world.conditionalRoles ?? []).map((role) => ({
                  role,
                  members: [`serviceAccount:${account}`],
                  condition: { title: "expires", expression: "request.time < timestamp(\"2020-01-01T00:00:00Z\")" },
                })),
              ],
            });
          }
          roles.push(command.args[command.args.indexOf("--role") + 1]);
          return "";
        }
        default:
          throw new Error(`unexpected gcloud ${command.args.join(" ")}`);
      }
    }
    const verb = command.args[1];
    calls.push(verb);
    switch (verb) {
      case "login:list":
        return world.loggedIn ? "user@example.com" : "No authorized accounts";
      case "projects:list":
        return JSON.stringify({ result: world.project ? [{ projectId: project }] : [] });
      case "projects:create":
        if (world.cloudOnly) throw new Error("already exists");
        world.project = true;
        return "";
      case "projects:addfirebase":
        if (!world.cloudOnly) throw new Error("no such project");
        world.project = true;
        world.cloudOnly = false;
        return "";
      case "firestore:databases:list":
        return JSON.stringify({
          result: world.database ? [{ name: `projects/${project}/databases/(default)` }] : [],
        });
      case "firestore:databases:create":
        world.database = true;
        return "";
      case "apps:list":
        return JSON.stringify({
          result: world.app ? [{ appId: "1:1:web:a", displayName: project }] : [],
        });
      case "apps:create":
        world.app = true;
        return "";
      case "apps:sdkconfig":
        return "SNIPPET";
      default:
        throw new Error(`unexpected ${verb}`);
    }
  };
  const exists = () => world.keyFile === true;
  return { calls, printed, keys, deps: { run, exists, print: (line: string) => printed.push(line) } };
}

test("creates every step on a fresh account and prints the snippet last", () => {
  const { calls, printed, deps } = harness({
    loggedIn: true,
    project: false,
    database: false,
    app: false,
  });
  provision({ project, location }, deps);
  assert.deepEqual(printed, [
    "project my-household-42: created",
    "firestore: created in eur3",
    "web app my-household-42: created",
    "SNIPPET",
  ]);
  assert.ok(calls.includes("projects:create"));
  assert.ok(calls.includes("firestore:databases:create"));
  assert.ok(calls.includes("apps:create"));
});

test("a second run creates nothing and still prints the snippet", () => {
  const { calls, printed, deps } = harness({
    loggedIn: true,
    project: true,
    database: true,
    app: true,
  });
  provision({ project, location }, deps);
  assert.deepEqual(printed, [
    "project my-household-42: already there",
    "firestore: already there",
    "web app my-household-42: already there",
    "SNIPPET",
  ]);
  assert.deepEqual(
    calls.filter((verb) => verb.endsWith(":create")),
    [],
  );
});

test("resumes at the first missing step", () => {
  const { printed, deps } = harness({ loggedIn: true, project: true, database: false, app: false });
  provision({ project, location }, deps);
  assert.deepEqual(printed.slice(0, 3), [
    "project my-household-42: already there",
    "firestore: created in eur3",
    "web app my-household-42: created",
  ]);
});

test("a logged-out CLI stops before changing anything and names the login command", () => {
  const { calls, printed, deps } = harness({
    loggedIn: false,
    project: false,
    database: false,
    app: false,
  });
  assert.throws(() => provision({ project, location }, deps), /Run: npx firebase login/);
  assert.deepEqual(calls, ["login:list"]);
  assert.deepEqual(printed, []);
});

test("a Cloud project that never got Firebase has Firebase added instead of being created again", () => {
  const { calls, printed, deps } = harness({
    loggedIn: true,
    project: false,
    database: false,
    app: false,
    cloudOnly: true,
  });
  provision({ project, location }, deps);
  assert.deepEqual(printed.slice(0, 2), [
    "project my-household-42: Firebase added",
    "firestore: created in eur3",
  ]);
  assert.ok(calls.includes("projects:addfirebase"));
});

test("a failed create that addfirebase cannot fix rethrows the create error", () => {
  const { deps } = harness({ loggedIn: true, project: false, database: false, app: false });
  const run = (command: Command): string => {
    if (command.args[1] === "projects:create") throw new Error("quota exceeded");
    return deps.run(command);
  };
  assert.throws(() => provision({ project, location }, { ...deps, run }), /quota exceeded/);
});

test("a missing gcloud stops before changing anything and prints the install link", () => {
  const { calls, printed, deps } = harness({
    loggedIn: true,
    project: false,
    database: false,
    app: false,
    gcloud: "missing",
  });
  assert.throws(
    () => provision({ project, location, keyOut }, deps),
    /https:\/\/cloud\.google\.com\/sdk\/docs\/install/,
  );
  assert.deepEqual(calls, ["login:list", "gcloud --version"]);
  assert.deepEqual(printed, []);
});

test("a logged-out gcloud stops before changing anything and prints the login command", () => {
  const { calls, printed, deps } = harness({
    loggedIn: true,
    project: false,
    database: false,
    app: false,
    gcloud: "logged-out",
  });
  assert.throws(() => provision({ project, location, keyOut }, deps), /Run: gcloud auth login/);
  assert.deepEqual(calls, ["login:list", "gcloud --version", "gcloud auth"]);
  assert.deepEqual(printed, []);
});

test("without --key-out gcloud is never touched", () => {
  const { calls, deps } = harness({
    loggedIn: true,
    project: true,
    database: true,
    app: true,
    gcloud: "missing",
  });
  provision({ project, location }, deps);
  assert.ok(!calls.some((call) => call.startsWith("gcloud")));
});

test("grants both roles to the deploy service account and prints one line each", () => {
  const world: World = {
    loggedIn: true,
    project: true,
    database: true,
    app: true,
    gcloud: "ready",
  };
  const { printed, deps } = harness(world);
  provision({ project, location, keyOut }, deps);
  assert.deepEqual(printed.slice(3, 5), [
    "role Service Usage Consumer: granted",
    "role Firebase Rules Admin: granted",
  ]);
  assert.deepEqual(world.roles, [
    "roles/serviceusage.serviceUsageConsumer",
    "roles/firebaserules.admin",
  ]);
});

test("a role already granted is skipped", () => {
  const world: World = {
    loggedIn: true,
    project: true,
    database: true,
    app: true,
    gcloud: "ready",
    roles: ["roles/serviceusage.serviceUsageConsumer"],
  };
  const { printed, deps } = harness(world);
  provision({ project, location, keyOut }, deps);
  assert.deepEqual(printed.slice(3, 5), [
    "role Service Usage Consumer: already there",
    "role Firebase Rules Admin: granted",
  ]);
  assert.deepEqual(world.roles, [
    "roles/serviceusage.serviceUsageConsumer",
    "roles/firebaserules.admin",
  ]);
});

test("writes the key to the path and prints one line", () => {
  const { printed, keys, deps } = harness({
    loggedIn: true,
    project: true,
    database: true,
    app: true,
    gcloud: "ready",
  });
  provision({ project, location, keyOut }, deps);
  assert.equal(printed[5], "key /home/me/key.json: created");
  assert.deepEqual(keys, [keyOut]);
});

test("an existing key file is not overwritten", () => {
  const { printed, keys, deps } = harness({
    loggedIn: true,
    project: true,
    database: true,
    app: true,
    gcloud: "ready",
    keyFile: true,
  });
  provision({ project, location, keyOut }, deps);
  assert.equal(printed[5], "key /home/me/key.json: already there");
  assert.deepEqual(keys, []);
});

test("a role bound only under a condition is granted again", () => {
  const world: World = {
    loggedIn: true,
    project: true,
    database: true,
    app: true,
    gcloud: "ready",
    conditionalRoles: ["roles/firebaserules.admin"],
  };
  const { printed, deps } = harness(world);
  provision({ project, location, keyOut }, deps);
  assert.equal(printed[4], "role Firebase Rules Admin: granted");
  assert.deepEqual(world.roles, [
    "roles/serviceusage.serviceUsageConsumer",
    "roles/firebaserules.admin",
  ]);
});
