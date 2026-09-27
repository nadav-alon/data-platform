import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { z } from "zod";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";

const alice = uid("alice");

// A scratch schema, not a real collection's: these tests exercise the harness itself, so they
// pass their own schemas map instead of resolving against the platform's real collections.
const widget = z.object({ name: z.string() });
const scratchSchemas = { widgets: widget };

let testEnv: RulesTestEnvironment;

before(async () => {
  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    throw new Error(
      "GCLOUD_PROJECT is not set; run this suite through `npm run test:rules`",
    );
  }

  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

test("passes a fixture zod and the emulator both reject", async () => {
  const fixture: RulesFixture = {
    name: "widget missing its name is rejected",
    collection: "widgets",
    doc: { id: "w1", data: {} },
    auth: null,
    expected: "reject",
  };

  await assertFixture(fixture, testEnv, scratchSchemas);
});

test("fails naming the fixture when the emulator disagrees with the expected verdict", async () => {
  // "widgets" isn't wired into any match block, so it falls through to the
  // default-deny catch-all: a fixture expecting "accept" here is exactly the
  // zod/rules disagreement this harness exists to catch.
  const fixture: RulesFixture = {
    name: "widget accepted by zod but denied by firestore.rules",
    collection: "widgets",
    doc: { id: "w1", data: { name: "gizmo" } },
    auth: { uid: alice },
    expected: "accept",
  };

  await assert.rejects(
    () => assertFixture(fixture, testEnv, scratchSchemas),
    /widget accepted by zod but denied by firestore\.rules/,
  );
});

test("fails naming the fixture when zod and rules agree, but not with the expected verdict", async () => {
  const fixture: RulesFixture = {
    name: "widget missing its name is expected to be accepted",
    collection: "widgets",
    doc: { id: "w1", data: {} },
    auth: null,
    expected: "accept",
  };

  await assert.rejects(
    () => assertFixture(fixture, testEnv, scratchSchemas),
    /widget missing its name is expected to be accepted/,
  );
});

test("fails naming the fixture when its collection isn't in the schema map", async () => {
  const fixture: RulesFixture = {
    name: "gizmo written to a collection nothing validates",
    collection: "gizmos",
    doc: { id: "g1", data: { name: "gizmo" } },
    auth: null,
    expected: "accept",
  };

  await assert.rejects(
    () => assertFixture(fixture, testEnv, scratchSchemas),
    /gizmo written to a collection nothing validates.*unknown collection "gizmos"/,
  );
});
