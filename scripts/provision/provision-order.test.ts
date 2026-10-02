import { test } from "node:test";
import assert from "node:assert/strict";
import { firebaseProjectId } from "../deploy/project-id.ts";
import { firestoreLocation } from "./firestore-location.ts";
import type { Command } from "./commands.ts";
import { provision } from "./provision-order.ts";

const project = firebaseProjectId("my-household-42");
const location = firestoreLocation("eur3");

type World = { loggedIn: boolean; project: boolean; database: boolean; app: boolean };

/** A fake Firebase CLI over `world`, recording every call and mutating on creates. */
function harness(world: World) {
  const calls: string[] = [];
  const printed: string[] = [];
  const run = (command: Command): string => {
    const verb = command.args[1];
    calls.push(verb);
    switch (verb) {
      case "login:list":
        return world.loggedIn ? "user@example.com" : "No authorized accounts";
      case "projects:list":
        return JSON.stringify({ result: world.project ? [{ projectId: project }] : [] });
      case "projects:create":
        world.project = true;
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
  return { calls, printed, deps: { run, print: (line: string) => printed.push(line) } };
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
