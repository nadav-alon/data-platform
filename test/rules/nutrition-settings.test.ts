import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { NUTRITION_SETTINGS_COLLECTION } from "../../src/nutrition/settings.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold, seedMember } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const bob = uid("bob");
const mallory = uid("mallory");

const rulesTestEnv = setupRulesTestEnv();

async function assertOwnSettings(
  name: string,
  data: Record<string, unknown>,
  expected: RulesFixture["expected"],
): Promise<void> {
  await seedHousehold(rulesTestEnv.env, alice);
  await assertFixture(
    {
      name,
      collection: NUTRITION_SETTINGS_COLLECTION,
      doc: { id: alice, data },
      auth: { uid: alice },
      expected,
    },
    rulesTestEnv.env,
  );
}

test("nutrition settings: a doc with googleHealthSync is accepted", async () => {
  await assertOwnSettings("switch on", { googleHealthSync: true }, "accept");
});

test("nutrition settings: an empty doc is accepted", async () => {
  await assertOwnSettings("switch off", {}, "accept");
});

test("nutrition settings: googleHealthSync false and unknown fields are rejected", async () => {
  await assertOwnSettings("false", { googleHealthSync: false }, "reject");
  await assertOwnSettings("string", { googleHealthSync: "true" }, "reject");
  await assertOwnSettings("unknown", { other: 1 }, "reject");
  await assertOwnSettings("unknown beside switch", { googleHealthSync: true, other: 1 }, "reject");
});

test("nutrition settings: a Member reads and updates their own doc but cannot delete it", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const doc = rulesTestEnv.env
    .authenticatedContext(alice)
    .firestore()
    .doc(`${NUTRITION_SETTINGS_COLLECTION}/${alice}`);
  await assertSucceeds(doc.set({ googleHealthSync: true }));
  await assertSucceeds(doc.get());
  await assertSucceeds(doc.set({}));
  await assertFails(doc.set({ googleHealthSync: false }));
  await assertFails(doc.set({ googleHealthSync: true, other: 1 }));
  await assertFails(doc.delete());
});

// Access-denial cases use bare assertFails, not the drift guard: assertFixture only writes, and a
// reject fixture needs zod to disagree with the rules, but zod accepts the `{}` a stranger writes.
test("nutrition settings: another Member, a non-member and an anonymous caller are denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  await rulesTestEnv.env
    .authenticatedContext(alice)
    .firestore()
    .doc(`${NUTRITION_SETTINGS_COLLECTION}/${alice}`)
    .set({ googleHealthSync: true });
  for (const db of [
    rulesTestEnv.env.authenticatedContext(bob).firestore(),
    rulesTestEnv.env.authenticatedContext(mallory).firestore(),
    rulesTestEnv.env.unauthenticatedContext().firestore(),
  ]) {
    const doc = db.doc(`${NUTRITION_SETTINGS_COLLECTION}/${alice}`);
    await assertFails(doc.get());
    await assertFails(doc.set({}));
    await assertFails(doc.delete());
  }
});

test("nutrition settings: a Member cannot write under another uid, a non-Member not even their own", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  const bobDb = rulesTestEnv.env.authenticatedContext(bob).firestore();
  await assertFails(bobDb.doc(`${NUTRITION_SETTINGS_COLLECTION}/${alice}`).set({}));
  await assertSucceeds(bobDb.doc(`${NUTRITION_SETTINGS_COLLECTION}/${bob}`).set({}));
  const malloryDb = rulesTestEnv.env.authenticatedContext(mallory).firestore();
  await assertFails(malloryDb.doc(`${NUTRITION_SETTINGS_COLLECTION}/${mallory}`).set({}));
});
