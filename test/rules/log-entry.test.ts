import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { Timestamp, serverTimestamp } from "firebase/firestore";
import { foodId } from "../../src/nutrition/food.ts";
import { LOG_ENTRIES_COLLECTION, NUTRITION_LOGS_COLLECTION } from "../../src/nutrition/log-entry.ts";
import { uid, type Uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold, seedMember } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const bob = uid("bob");
const mallory = uid("mallory");

const rulesTestEnv = setupRulesTestEnv();

const entriesOf = (owner: Uid) => `${NUTRITION_LOGS_COLLECTION}/${owner}/${LOG_ENTRIES_COLLECTION}`;

const nutrition = { kcal: 975, proteinG: 45, carbsG: 105, fatG: 37.5 };

const foodEntry = {
  eatenAt: new Date(1_700_000_000_000),
  mealType: "lunch",
  source: { kind: "food", foodId: foodId("schnitzel") },
  name: "Schnitzel plate",
  servings: 1.5,
  nutrition,
};

const quickEntry = { ...foodEntry, source: { kind: "quick" }, mealType: "snack", servings: 1 };

async function assertOwnEntry(
  name: string,
  data: Record<string, unknown>,
  expected: RulesFixture["expected"],
): Promise<void> {
  await seedHousehold(rulesTestEnv.env, alice);
  await assertFixture(
    { name, collection: entriesOf(alice), doc: { id: "e1", data }, auth: { uid: alice }, expected },
    rulesTestEnv.env,
  );
}

async function seedEntry(owner: Uid, extra: Record<string, unknown> = {}): Promise<void> {
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${entriesOf(owner)}/e1`).set({ ...foodEntry, ...extra });
  });
}

const entryDoc = (context: ReturnType<typeof rulesTestEnv.env.authenticatedContext>, owner = alice) =>
  context.firestore().doc(`${entriesOf(owner)}/e1`);

test("collection validation: a valid food entry and a valid quick entry are accepted", async () => {
  await assertOwnEntry("food entry", foodEntry, "accept");
  await assertOwnEntry("quick entry", quickEntry, "accept");
  await assertOwnEntry("synced entry", { ...foodEntry, googleHealthId: "gh-1" }, "accept");
  await assertOwnEntry("stale synced entry", { ...foodEntry, googleHealthId: "gh-1", googleHealthStale: true }, "accept");
});

test("collection validation: googleHealthStale without googleHealthId, or false, is rejected", async () => {
  await assertOwnEntry("stale without id", { ...foodEntry, googleHealthStale: true }, "reject");
  await assertOwnEntry("stale false", { ...foodEntry, googleHealthId: "gh-1", googleHealthStale: false }, "reject");
});

test("collection validation: estimated: true is accepted; false and other values are rejected", async () => {
  await assertOwnEntry("estimated quick entry", { ...quickEntry, estimated: true }, "accept");
  await assertOwnEntry("estimated false", { ...quickEntry, estimated: false }, "reject");
  await assertOwnEntry("estimated yes", { ...quickEntry, estimated: "yes" }, "reject");
});

test("collection validation: zero servings are rejected", async () => {
  await assertOwnEntry("zero servings", { ...foodEntry, servings: 0 }, "reject");
  await assertOwnEntry("infinite servings", { ...foodEntry, servings: Infinity }, "reject");
});

test("collection validation: an unknown mealType is rejected", async () => {
  await assertOwnEntry("brunch", { ...foodEntry, mealType: "brunch" }, "reject");
});

test("collection validation: a food source without foodId is rejected", async () => {
  await assertOwnEntry("no foodId", { ...foodEntry, source: { kind: "food" } }, "reject");
});

test("collection validation: an empty name and incomplete nutrition are rejected", async () => {
  await assertOwnEntry("empty name", { ...foodEntry, name: "" }, "reject");
  await assertOwnEntry("partial nutrition", { ...foodEntry, nutrition: { kcal: 1 } }, "reject");
});

test("access: another Member, a non-member and an anonymous caller cannot read or write a Member's entries", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  await seedEntry(alice);
  for (const context of [
    rulesTestEnv.env.authenticatedContext(bob),
    rulesTestEnv.env.authenticatedContext(mallory),
    rulesTestEnv.env.unauthenticatedContext(),
  ]) {
    await assertFails(entryDoc(context).get());
    await assertFails(entryDoc(context).set(foodEntry));
    await assertFails(entryDoc(context).update({ name: "Pizza" }));
    await assertFails(context.firestore().collection(entriesOf(alice)).get());
  }
});

test("access: a signed-in non-Member cannot write under their own uid", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await assertFails(entryDoc(rulesTestEnv.env.authenticatedContext(mallory), mallory).set(foodEntry));
});

test("update: the owner reads, edits and syncs their entry", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedEntry(alice);
  const doc = entryDoc(rulesTestEnv.env.authenticatedContext(alice));
  await assertSucceeds(doc.get());
  await assertSucceeds(doc.update({ servings: 2, googleHealthId: "gh-1" }));
  await assertFails(doc.update({ servings: 0 }));
  await assertSucceeds(doc.update({ estimated: true }));
  await assertFails(doc.update({ estimated: false }));
});

test("soft delete: the owner soft-deletes and restores an entry", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedEntry(alice);
  const doc = entryDoc(rulesTestEnv.env.authenticatedContext(alice));
  await assertFails(doc.update({ deletedAt: Timestamp.fromMillis(0) }));
  await assertSucceeds(doc.update({ deletedAt: serverTimestamp() }));
  await assertSucceeds(doc.set(foodEntry));
});

test("soft delete: creating an already soft-deleted entry is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await assertFails(entryDoc(rulesTestEnv.env.authenticatedContext(alice)).set({ ...foodEntry, deletedAt: serverTimestamp() }));
});

test("hard delete: the owner cannot delete a live or soft-deleted entry", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedEntry(alice);
  await assertFails(entryDoc(rulesTestEnv.env.authenticatedContext(alice)).delete());
  await seedEntry(alice, { deletedAt: Timestamp.fromMillis(1_700_000_000_000) });
  await assertFails(entryDoc(rulesTestEnv.env.authenticatedContext(alice)).delete());
});

test("collection validation: an infinite nutrition macro is rejected", async () => {
  for (const key of Object.keys(nutrition)) {
    await assertOwnEntry(`infinite ${key}`, { ...foodEntry, nutrition: { ...nutrition, [key]: Infinity } }, "reject");
  }
});

test("collection validation: the largest finite servings are accepted", async () => {
  await assertOwnEntry("max servings", { ...foodEntry, servings: Number.MAX_VALUE }, "accept");
});
