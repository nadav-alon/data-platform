import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { serverTimestamp } from "firebase/firestore";
import { RECIPES_COLLECTION } from "../../src/recipes/recipe.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seededDeletedAt, seedHousehold, seedMember } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const bob = uid("bob");

const rulesTestEnv = setupRulesTestEnv();

const validRecipe = {
  title: "Pancakes",
  ingredients: [
    { name: "Flour", itemId: "flour", quantity: 200, unit: "g", prepNote: "sifted" },
    { name: "Salt", assumed: true },
  ],
  prepSteps: ["Sift the flour"],
  steps: ["Mix", "Fry"],
  servings: 4,
  sourceUrl: "https://example.com/pancakes",
  notes: "Good",
};

async function seedRecipe(deleted = false): Promise<void> {
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`${RECIPES_COLLECTION}/pancakes`)
      .set({ ...validRecipe, ...(deleted ? { deletedAt: seededDeletedAt } : {}) });
  });
}

async function assertMemberWrite(
  name: string,
  data: Record<string, unknown>,
  expected: RulesFixture["expected"],
): Promise<void> {
  await seedHousehold(rulesTestEnv.env, alice);
  await assertFixture(
    { name, collection: RECIPES_COLLECTION, doc: { id: "pancakes", data }, auth: { uid: alice }, expected },
    rulesTestEnv.env,
  );
}

const withIngredient = (ingredient: Record<string, unknown>) => ({
  ...validRecipe,
  ingredients: [ingredient],
});

test("collection validation: a Member creating a valid Recipe is accepted", async () => {
  await assertMemberWrite("valid Recipe", validRecipe, "accept");
});

test("collection validation: a Recipe with an empty title is rejected", async () => {
  await assertMemberWrite("empty title", { ...validRecipe, title: "" }, "reject");
});

test("collection validation: an Ingredient with an empty name is rejected", async () => {
  await assertMemberWrite("empty Ingredient name", withIngredient({ name: "" }), "reject");
});

test("collection validation: an Ingredient both assumed and naming an Item is rejected", async () => {
  await assertMemberWrite(
    "assumed with itemId",
    withIngredient({ name: "Salt", assumed: true, itemId: "salt" }),
    "reject",
  );
});

test("collection validation: an Ingredient with a unit but no quantity is rejected", async () => {
  await assertMemberWrite("unit without quantity", withIngredient({ name: "Flour", unit: "g" }), "reject");
});

test("collection validation: an Ingredient with an unknown unit is rejected", async () => {
  await assertMemberWrite(
    "unknown unit",
    withIngredient({ name: "Flour", quantity: 1, unit: "pinch" }),
    "reject",
  );
});

test("collection validation: a Recipe with an empty step is rejected", async () => {
  await assertMemberWrite("empty step", { ...validRecipe, steps: [""] }, "reject");
});

test("collection validation: a Recipe with fractional servings is rejected", async () => {
  await assertMemberWrite("fractional servings", { ...validRecipe, servings: 1.5 }, "reject");
});

test("isMember() gate: a signed-in non-member creating a Recipe is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(uid("mallory"));
  await assertFails(context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).set(validRecipe));
});

test("isMember() gate: a non-member cannot read a Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe();

  const context = rulesTestEnv.env.authenticatedContext(uid("mallory"));
  await assertFails(context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).get());
});

test("update: a Member can edit a live Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  await seedRecipe();

  const context = rulesTestEnv.env.authenticatedContext(bob);
  await assertSucceeds(
    context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).set({ ...validRecipe, title: "Crepes" }),
  );
});

test("update: a Member updating a Recipe into an invalid one is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe();

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).update({ title: "" }));
});

test("soft delete: a Member can soft-delete a Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe();

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertSucceeds(
    context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).update({ deletedAt: serverTimestamp() }),
  );
});

test("soft delete: a Member setting a Recipe's deletedAt to a client-chosen time is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe();

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).update({ deletedAt: new Date(0) }),
  );
});

test("soft delete: creating a Recipe that is already soft-deleted is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context
      .firestore()
      .doc(`${RECIPES_COLLECTION}/pancakes`)
      .set({ ...validRecipe, deletedAt: serverTimestamp() }),
  );
});

test("soft delete: a soft-deleted Recipe can be restored", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(true);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertSucceeds(context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).set(validRecipe));
});

test("soft delete: restoring a Recipe by writing deletedAt: null is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(true);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).update({ deletedAt: null }));
});

test("hard delete: the Owner cannot delete a Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe();

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${RECIPES_COLLECTION}/pancakes`).delete());
});

test("hard delete: the Owner cannot delete a soft-deleted Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(true);

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${RECIPES_COLLECTION}/pancakes`).delete());
});

test("hard delete: a non-Owner Member cannot delete a Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  await seedRecipe();

  const firestore = rulesTestEnv.env.authenticatedContext(bob).firestore();
  await assertFails(firestore.doc(`${RECIPES_COLLECTION}/pancakes`).delete());
});
