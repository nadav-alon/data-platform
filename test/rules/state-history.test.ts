import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { serverTimestamp } from "firebase/firestore";
import { ITEMS_COLLECTION } from "../../src/core/item.ts";
import { STATE_HISTORY_COLLECTION, stateHistoryEntrySchema } from "../../src/core/state-history.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold } from "./seed.ts";

const alice = uid("alice");
const mallory = uid("mallory");

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

function entryPath(itemId: string, entryId: string): string {
  return `${ITEMS_COLLECTION}/${itemId}/${STATE_HISTORY_COLLECTION}/${entryId}`;
}

test("collection validation: a Member creating a stateHistory entry with a state outside the enum is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "stateHistory entry with a state outside the State enum",
    collection: `${ITEMS_COLLECTION}/dish-soap/${STATE_HISTORY_COLLECTION}`,
    schema: stateHistoryEntrySchema,
    doc: {
      id: "entry-1",
      data: { state: "almost gone", at: { seconds: 1_700_000_000, nanoseconds: 0 } },
    },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating a stateHistory entry missing its state is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "stateHistory entry missing its state",
    collection: `${ITEMS_COLLECTION}/dish-soap/${STATE_HISTORY_COLLECTION}`,
    schema: stateHistoryEntrySchema,
    doc: { id: "entry-1", data: { at: { seconds: 1_700_000_000, nanoseconds: 0 } } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("create-only history: a Member creating a stateHistory entry with the server's own commit time is accepted", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(alice);
  await assertSucceeds(
    context.firestore().doc(entryPath("dish-soap", "entry-1")).set({
      state: "out",
      at: serverTimestamp(),
    }),
  );
});

test("create-only history: a Member creating a stateHistory entry with a client-supplied at is denied", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(entryPath("dish-soap", "entry-1")).set({
      state: "out",
      at: new Date(),
    }),
  );
});

test("isMember() gate: a signed-in non-member creating a stateHistory entry is denied", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(mallory);
  await assertFails(
    context.firestore().doc(entryPath("dish-soap", "entry-1")).set({
      state: "out",
      at: serverTimestamp(),
    }),
  );
});

test("create-only history: a Member updating an existing stateHistory entry is denied", async () => {
  await seedHousehold(testEnv, alice);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(entryPath("dish-soap", "entry-1")).set({
      state: "out",
      at: { seconds: 1_700_000_000, nanoseconds: 0 },
    });
  });

  const context = testEnv.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(entryPath("dish-soap", "entry-1")).update({ state: "enough" }),
  );
});

test("create-only history: a Member deleting an existing stateHistory entry is denied", async () => {
  await seedHousehold(testEnv, alice);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(entryPath("dish-soap", "entry-1")).set({
      state: "out",
      at: { seconds: 1_700_000_000, nanoseconds: 0 },
    });
  });

  const context = testEnv.authenticatedContext(alice);
  await assertFails(context.firestore().doc(entryPath("dish-soap", "entry-1")).delete());
});
