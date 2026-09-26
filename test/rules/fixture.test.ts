import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { z } from "zod";
import { assertFixture, type RulesFixture } from "./fixture.ts";

// A scratch schema, not a real collection's: these tests exercise the
// harness itself.
const widget = z.object({ name: z.string() });

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
    schema: widget,
    doc: { id: "w1", data: {} },
    auth: null,
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("fails naming the fixture when the emulator disagrees with the expected verdict", async () => {
  // TODO[#6]: firestore.rules denies everything until the membership gate
  // lands, so a fixture expecting "accept" here is exactly the zod/rules
  // disagreement this harness exists to catch.
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

test("fails naming the fixture when zod and rules agree, but not with the expected verdict", async () => {
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
