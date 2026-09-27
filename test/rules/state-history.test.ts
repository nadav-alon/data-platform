import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
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
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const mallory = uid("mallory");
const dishSoap = itemId("dish-soap");

const rulesTestEnv = setupRulesTestEnv();

test("collection validation: a Member creating a State history entry with a state outside the enum is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

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

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating a State history entry missing its state is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "State history entry missing its state",
    collection: stateHistoryCollectionPath(dishSoap),
    schema: stateHistoryEntrySchema,
    doc: { id: "entry-1", data: { at: { seconds: 1_700_000_000, nanoseconds: 0 } } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

// The next two cases go straight through the emulator, not `assertFixture`: `serverTimestamp()`
// and a client `Date` both fail to parse against `stateHistoryEntrySchema.at` (see that
// schema's comment), so there is no accept fixture where zod and the emulator agree on this
// field — only the emulator side is deliberately covered here.

test("create-only history: a Member creating a State history entry with the server's own commit time is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertSucceeds(
    context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).set({
      state: "out",
      at: serverTimestamp(),
    }),
  );
});

test("create-only history: a Member creating a State history entry with a client-supplied at is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).set({
      state: "out",
      at: new Date(),
    }),
  );
});

test("isMember() gate: a signed-in non-member creating a State history entry is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(mallory);
  await assertFails(
    context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).set({
      state: "out",
      at: serverTimestamp(),
    }),
  );
});

test("create-only history: a Member updating an existing State history entry is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).set({
      state: "out",
      at: { seconds: 1_700_000_000, nanoseconds: 0 },
    });
  });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).update({ state: "enough" }),
  );
});

test("create-only history: a Member deleting an existing State history entry is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).set({
      state: "out",
      at: { seconds: 1_700_000_000, nanoseconds: 0 },
    });
  });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(context.firestore().doc(stateHistoryEntryDocPath(dishSoap, "entry-1")).delete());
});
