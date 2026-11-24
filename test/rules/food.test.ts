import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { serverTimestamp } from "firebase/firestore";
import { FOODS_COLLECTION, foodId } from "../../src/nutrition/food.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedFood, seedHousehold, seedMember } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const bob = uid("bob");

const rulesTestEnv = setupRulesTestEnv();

const perServing = { kcal: 650, proteinG: 30, carbsG: 70, fatG: 25 };

const validFood = {
  name: "Schnitzel plate",
  place: "work canteen",
  perServing,
  servingLabel: "1 plate",
  estimated: true,
};

async function assertMemberWrite(
  name: string,
  data: Record<string, unknown>,
  expected: RulesFixture["expected"],
): Promise<void> {
  await seedHousehold(rulesTestEnv.env, alice);
  await assertFixture(
    { name, collection: FOODS_COLLECTION, doc: { id: "schnitzel", data }, auth: { uid: alice }, expected },
    rulesTestEnv.env,
  );
}

const foodDoc = (context: ReturnType<typeof rulesTestEnv.env.authenticatedContext>) =>
  context.firestore().doc(`${FOODS_COLLECTION}/schnitzel`);

test("collection validation: a Member creating a valid Food is accepted", async () => {
  await assertMemberWrite("valid Food", validFood, "accept");
});

test("collection validation: a Food with only a name and perServing is accepted", async () => {
  await assertMemberWrite("minimal Food", { name: "Apple", perServing }, "accept");
});

test("collection validation: a Food with an empty name is rejected", async () => {
  await assertMemberWrite("empty name", { ...validFood, name: "" }, "reject");
});

test("collection validation: a Food with a negative macro is rejected", async () => {
  for (const key of Object.keys(perServing)) {
    await assertMemberWrite(`negative ${key}`, { ...validFood, perServing: { ...perServing, [key]: -1 } }, "reject");
  }
});

test("collection validation: a Food with zero macros is accepted", async () => {
  await assertMemberWrite(
    "zero macros",
    { ...validFood, perServing: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 } },
    "accept",
  );
});

test("collection validation: a Food without perServing is rejected", async () => {
  const { perServing: _omitted, ...rest } = validFood;
  await assertMemberWrite("missing perServing", rest, "reject");
});

test("collection validation: a Food whose perServing lacks a macro is rejected", async () => {
  const { fatG: _omitted, ...partial } = perServing;
  await assertMemberWrite("missing fatG", { ...validFood, perServing: partial }, "reject");
});

test("collection validation: a Food whose macro is not a number is rejected", async () => {
  await assertMemberWrite("string macro", { ...validFood, perServing: { ...perServing, kcal: "650" } }, "reject");
});

test("collection validation: estimated: false is rejected", async () => {
  await assertMemberWrite("estimated false", { ...validFood, estimated: false }, "reject");
});

test("collection validation: a non-string place is rejected", async () => {
  await assertMemberWrite("numeric place", { ...validFood, place: 3 }, "reject");
});

test("isMember() gate: a signed-in non-member cannot create, read, list or update a Food", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedFood(rulesTestEnv.env, foodId("schnitzel"));

  const context = rulesTestEnv.env.authenticatedContext(uid("mallory"));
  await assertFails(foodDoc(context).set(validFood));
  await assertFails(foodDoc(context).get());
  await assertFails(foodDoc(context).update({ name: "Pizza" }));
  await assertFails(foodDoc(context).delete());
  await assertFails(context.firestore().collection(FOODS_COLLECTION).get());
});

test("isMember() gate: an unauthenticated request cannot read, write or delete a Food", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedFood(rulesTestEnv.env, foodId("schnitzel"));

  const firestore = rulesTestEnv.env.unauthenticatedContext().firestore();
  await assertFails(firestore.doc(`${FOODS_COLLECTION}/schnitzel`).get());
  await assertFails(firestore.doc(`${FOODS_COLLECTION}/schnitzel`).set(validFood));
  await assertFails(firestore.doc(`${FOODS_COLLECTION}/schnitzel`).delete());
});

test("read: a Member who is not the Owner can read a Food", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  await seedFood(rulesTestEnv.env, foodId("schnitzel"));

  await assertSucceeds(foodDoc(rulesTestEnv.env.authenticatedContext(bob)).get());
});

test("update: a Member can edit a live Food", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  await seedFood(rulesTestEnv.env, foodId("schnitzel"));

  await assertSucceeds(foodDoc(rulesTestEnv.env.authenticatedContext(bob)).set({ ...validFood, name: "Pizza" }));
});

test("update: a Member updating a Food into an invalid one is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedFood(rulesTestEnv.env, foodId("schnitzel"));

  await assertFails(foodDoc(rulesTestEnv.env.authenticatedContext(alice)).update({ name: "" }));
});

test("soft delete: a Member can soft-delete a Food", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedFood(rulesTestEnv.env, foodId("schnitzel"));

  await assertSucceeds(
    foodDoc(rulesTestEnv.env.authenticatedContext(alice)).update({ deletedAt: serverTimestamp() }),
  );
});

test("soft delete: a client-chosen deletedAt is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedFood(rulesTestEnv.env, foodId("schnitzel"));

  await assertFails(foodDoc(rulesTestEnv.env.authenticatedContext(alice)).update({ deletedAt: new Date(0) }));
});

test("soft delete: creating a Food that is already soft-deleted is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  await assertFails(
    foodDoc(rulesTestEnv.env.authenticatedContext(alice)).set({ ...validFood, deletedAt: serverTimestamp() }),
  );
});

test("soft delete: a soft-deleted Food can be restored", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedFood(rulesTestEnv.env, foodId("schnitzel"), { deleted: true });

  await assertSucceeds(foodDoc(rulesTestEnv.env.authenticatedContext(alice)).set(validFood));
});

test("hard delete: no Member can delete a live or soft-deleted Food", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  await seedFood(rulesTestEnv.env, foodId("schnitzel"));
  await seedFood(rulesTestEnv.env, foodId("retired"), { deleted: true });

  for (const member of [alice, bob]) {
    const firestore = rulesTestEnv.env.authenticatedContext(member).firestore();
    await assertFails(firestore.doc(`${FOODS_COLLECTION}/schnitzel`).delete());
    await assertFails(firestore.doc(`${FOODS_COLLECTION}/retired`).delete());
  }
});
