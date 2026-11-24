import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { NUTRITION_TARGETS_COLLECTION, TARGET_FIELDS } from "../../src/nutrition/targets.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold, seedMember } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const bob = uid("bob");
const mallory = uid("mallory");

const rulesTestEnv = setupRulesTestEnv();

async function assertOwnTargets(
  name: string,
  data: Record<string, unknown>,
  expected: RulesFixture["expected"],
): Promise<void> {
  await seedHousehold(rulesTestEnv.env, alice);
  await assertFixture(
    {
      name,
      collection: NUTRITION_TARGETS_COLLECTION,
      doc: { id: alice, data },
      auth: { uid: alice },
      expected,
    },
    rulesTestEnv.env,
  );
}

test("targets: a Member writing their own valid Targets is accepted", async () => {
  await assertOwnTargets("all four", { kcal: 2000, proteinG: 120, carbsG: 250, fatG: 70.5 }, "accept");
  await assertOwnTargets("one", { proteinG: 120 }, "accept");
});

test("targets: an empty document is accepted", async () => {
  await assertOwnTargets("empty", {}, "accept");
});

test("targets: zero, negative, infinite and non-numeric values are rejected", async () => {
  for (const field of TARGET_FIELDS) {
    await assertOwnTargets(`${field} zero`, { [field]: 0 }, "reject");
    await assertOwnTargets(`${field} negative`, { [field]: -5 }, "reject");
    await assertOwnTargets(`${field} string`, { [field]: "100" }, "reject");
    await assertOwnTargets(`${field} infinity`, { [field]: Infinity }, "reject");
  }
});

test("targets: a Member reads, updates and clears their own Targets", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const doc = rulesTestEnv.env
    .authenticatedContext(alice)
    .firestore()
    .doc(`${NUTRITION_TARGETS_COLLECTION}/${alice}`);
  await assertSucceeds(doc.set({ kcal: 2000 }));
  await assertSucceeds(doc.get());
  await assertSucceeds(doc.set({ kcal: 1800 }));
  await assertFails(doc.set({ kcal: 0 }));
  await assertSucceeds(doc.delete());
});

test("targets: another Member, a non-member and an anonymous caller can neither read nor write them", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  await rulesTestEnv.env
    .authenticatedContext(alice)
    .firestore()
    .doc(`${NUTRITION_TARGETS_COLLECTION}/${alice}`)
    .set({ kcal: 2000 });
  for (const db of [
    rulesTestEnv.env.authenticatedContext(bob).firestore(),
    rulesTestEnv.env.authenticatedContext(mallory).firestore(),
    rulesTestEnv.env.unauthenticatedContext().firestore(),
  ]) {
    const doc = db.doc(`${NUTRITION_TARGETS_COLLECTION}/${alice}`);
    await assertFails(doc.get());
    await assertFails(doc.set({ kcal: 1 }));
    await assertFails(doc.delete());
  }
});

test("targets: a Member cannot write a Targets doc under another uid", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  const db = rulesTestEnv.env.authenticatedContext(bob).firestore();
  await assertFails(db.doc(`${NUTRITION_TARGETS_COLLECTION}/${alice}`).set({ kcal: 2000 }));
  await assertSucceeds(db.doc(`${NUTRITION_TARGETS_COLLECTION}/${bob}`).set({ kcal: 2000 }));
});

test("targets: a signed-in non-Member cannot read, write or delete a doc under their own uid", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const doc = rulesTestEnv.env
    .authenticatedContext(mallory)
    .firestore()
    .doc(`${NUTRITION_TARGETS_COLLECTION}/${mallory}`);
  await assertFails(doc.get());
  await assertFails(doc.set({ kcal: 2000 }));
  await assertFails(doc.delete());
});
