import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { z } from "zod";
import { assertFixture, type RulesFixture } from "./fixture.ts";

// A scratch schema standing in for a real collection's: #2 only has to prove
// the harness catches drift, not ship a collection of its own.
const widget = z.object({ name: z.string() });

let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-data-platform-rules-test",
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
    schema: widget,
    doc: { id: "w1", data: {} },
    auth: null,
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("fails naming the fixture when the emulator disagrees with the expected verdict", async () => {
  // firestore.rules denies everything at this point (#6/#7 open it up), so a
  // fixture expecting "accept" is exactly the zod/rules disagreement #2's
  // acceptance criteria calls for.
  const fixture: RulesFixture = {
    name: "widget accepted by zod but denied by firestore.rules",
    collection: "widgets",
    schema: widget,
    doc: { id: "w1", data: { name: "gizmo" } },
    auth: { uid: "alice" },
    expected: "accept",
  };

  await assert.rejects(
    () => assertFixture(fixture, testEnv),
    /widget accepted by zod but denied by firestore\.rules/,
  );
});

test("fails naming the fixture when zod disagrees with the expected verdict", async () => {
  const fixture: RulesFixture = {
    name: "widget missing its name is expected to be accepted",
    collection: "widgets",
    schema: widget,
    doc: { id: "w1", data: {} },
    auth: null,
    expected: "accept",
  };

  await assert.rejects(
    () => assertFixture(fixture, testEnv),
    /widget missing its name is expected to be accepted/,
  );
});
