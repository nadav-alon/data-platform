import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { serverTimestamp } from "firebase/firestore";
import { itemId } from "../../src/core/item.ts";
import {
  stateHistoryCollectionPath,
  stateHistoryEntryDocPath,
  stateHistoryEntrySchema,
} from "../../src/core/state-history.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold } from "./seed.ts";

const alice = uid("alice");
const mallory = uid("mallory");
const dishSoap = itemId("dish-soap");

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

test("collection validation: a Member creating a State history entry with a state outside the enum is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "State history entry with a state outside the State enum",
    collection: stateHistoryCollectionPath(dishSoap),
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

test("collection validation: a Member creating a State history entry missing its state is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "State history entry missing its state",
    collection: stateHistoryCollectionPath(dishSoap),
    schema: stateHistoryEntrySchema,
    doc: { id: "entry-1", data: { at: { seconds: 1_700_000_000, nanoseconds: 0 } } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

// The next two cases go straight through the emulator, not `assertFixture`: `serverTimestamp()`
// and a client `Date` both fail to parse against `stateHistoryEntrySchema.at` (see that
// schema's comment), so there is no accept fixture where zod and the emulator agree on this
// field — only the emulator side is deliberately covered here.

test("create-only history: a Member creating a State history entry with the server's own commit time is accepted", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(alice);
  await assertSucceeds(
    context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).set({
      state: "out",
      at: serverTimestamp(),
    }),
  );
});

test("create-only history: a Member creating a State history entry with a client-supplied at is denied", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).set({
      state: "out",
      at: new Date(),
    }),
  );
});

test("isMember() gate: a signed-in non-member creating a State history entry is denied", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(mallory);
  await assertFails(
    context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).set({
      state: "out",
      at: serverTimestamp(),
    }),
  );
});

test("create-only history: a Member updating an existing State history entry is denied", async () => {
  await seedHousehold(testEnv, alice);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).set({
      state: "out",
      at: { seconds: 1_700_000_000, nanoseconds: 0 },
    });
  });

  const context = testEnv.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).update({ state: "enough" }),
  );
});

test("create-only history: a Member deleting an existing State history entry is denied", async () => {
  await seedHousehold(testEnv, alice);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).set({
      state: "out",
      at: { seconds: 1_700_000_000, nanoseconds: 0 },
    });
  });

  const context = testEnv.authenticatedContext(alice);
  await assertFails(context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).delete());
});
