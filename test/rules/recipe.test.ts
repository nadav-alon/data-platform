import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteField, serverTimestamp } from "firebase/firestore";
import { INGREDIENT_UNITS, RECIPES_COLLECTION } from "../../src/recipes/recipe.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold, seedMember, seedRecipe } from "./seed.ts";
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

test("collection validation: an Ingredient with an infinite quantity is rejected", async () => {
  await assertMemberWrite(
    "infinite quantity",
    withIngredient({ name: "Flour", quantity: Infinity, unit: "g" }),
    "reject",
  );
});

test("collection validation: an Ingredient with the largest finite quantity is accepted", async () => {
  await assertMemberWrite(
    "largest finite quantity",
    withIngredient({ name: "Flour", quantity: Number.MAX_VALUE, unit: "g" }),
    "accept",
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

for (const unit of INGREDIENT_UNITS) {
  test(`collection validation: an Ingredient with the unit ${unit} is accepted`, async () => {
    await assertMemberWrite(`unit ${unit}`, withIngredient({ name: "Flour", quantity: 1, unit }), "accept");
  });
}

test("collection validation: a Recipe with an empty step is rejected", async () => {
  await assertMemberWrite("empty step", { ...validRecipe, steps: [""] }, "reject");
});

// Known drift (#284): the rules check only the first element of a list, so an invalid second
// element is accepted by the rules though zod rejects it. Pinned directly, as the drift guard
// cannot express a verdict the two disagree on. When the rules close the gap, flip these to assertFails.
test("known drift: an invalid second Ingredient is accepted by the rules", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertSucceeds(
    firestore.doc(`${RECIPES_COLLECTION}/pancakes`).set({
      ...validRecipe,
      ingredients: [{ name: "Flour" }, { name: "Salt", assumed: true, itemId: "salt" }],
    }),
  );
});

test("known drift: an empty second step is accepted by the rules", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertSucceeds(
    firestore.doc(`${RECIPES_COLLECTION}/pancakes`).set({ ...validRecipe, steps: ["Mix", ""] }),
  );
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
  await seedRecipe(rulesTestEnv.env, "pancakes");

  const context = rulesTestEnv.env.authenticatedContext(uid("mallory"));
  await assertFails(context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).get());
});

test("isMember() gate: a non-member cannot update a Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(rulesTestEnv.env, "pancakes");

  const context = rulesTestEnv.env.authenticatedContext(uid("mallory"));
  await assertFails(context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).update({ title: "Crepes" }));
});

test("isMember() gate: a non-member cannot delete a Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(rulesTestEnv.env, "pancakes");

  const context = rulesTestEnv.env.authenticatedContext(uid("mallory"));
  await assertFails(context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).delete());
});

test("isMember() gate: an unauthenticated request cannot read, write or delete a Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(rulesTestEnv.env, "pancakes");

  const firestore = rulesTestEnv.env.unauthenticatedContext().firestore();
  await assertFails(firestore.doc(`${RECIPES_COLLECTION}/pancakes`).get());
  await assertFails(firestore.doc(`${RECIPES_COLLECTION}/pancakes`).set(validRecipe));
  await assertFails(firestore.doc(`${RECIPES_COLLECTION}/pancakes`).delete());
});

test("update: a Member can edit a live Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  await seedRecipe(rulesTestEnv.env, "pancakes");

  const context = rulesTestEnv.env.authenticatedContext(bob);
  await assertSucceeds(
    context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).set({ ...validRecipe, title: "Crepes" }),
  );
});

test("update: a Member updating a Recipe into an invalid one is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(rulesTestEnv.env, "pancakes");

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).update({ title: "" }));
});

test("soft delete: a Member can soft-delete a Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(rulesTestEnv.env, "pancakes");

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertSucceeds(
    context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).update({ deletedAt: serverTimestamp() }),
  );
});

test("soft delete: a Member setting a Recipe's deletedAt to a client-chosen time is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(rulesTestEnv.env, "pancakes");

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
  await seedRecipe(rulesTestEnv.env, "pancakes", { deleted: true });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertSucceeds(context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).set(validRecipe));
});

test("soft delete: restoring a Recipe by writing deletedAt: null is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(rulesTestEnv.env, "pancakes", { deleted: true });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(context.firestore().doc(`${RECIPES_COLLECTION}/pancakes`).update({ deletedAt: null }));
});

test("hard delete: the Owner cannot delete a Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(rulesTestEnv.env, "pancakes");

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${RECIPES_COLLECTION}/pancakes`).delete());
});

test("hard delete: the Owner cannot delete a soft-deleted Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(rulesTestEnv.env, "pancakes", { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${RECIPES_COLLECTION}/pancakes`).delete());
});

test("hard delete: a non-Owner Member cannot delete a Recipe", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  await seedRecipe(rulesTestEnv.env, "pancakes");

  const firestore = rulesTestEnv.env.authenticatedContext(bob).firestore();
  await assertFails(firestore.doc(`${RECIPES_COLLECTION}/pancakes`).delete());
});

test("collection validation: a Wanted Recipe is accepted", async () => {
  await assertMemberWrite("wanted", { ...validRecipe, wanted: true }, "accept");
});

test("collection validation: wanted: false is rejected", async () => {
  await assertMemberWrite("wanted false", { ...validRecipe, wanted: false }, "reject");
});

const flour = { name: "Flour" };
const wantedBought = (bought: unknown, ingredient: Record<string, unknown> = flour) => ({
  ...withIngredient(ingredient),
  wanted: true,
  boughtIngredients: bought,
});

test("collection validation: a bought Unlinked Ingredient of a Wanted Recipe is accepted", async () => {
  await assertMemberWrite("bought unlinked", wantedBought({ Flour: true }), "accept");
});

test("collection validation: a Bought on a Recipe that is not Wanted is rejected", async () => {
  await assertMemberWrite("bought not wanted", { ...withIngredient(flour), boughtIngredients: { Flour: true } }, "reject");
});

test("collection validation: an empty boughtIngredients on a Recipe that is not Wanted is accepted", async () => {
  await assertMemberWrite("no bought", { ...withIngredient(flour), boughtIngredients: {} }, "accept");
});

/**
 * Rules only: `recipeSchema` deliberately accepts a Bought name that matches no unlinked Ingredient, so a
 * stale one cannot make a Recipe unreadable, which a drift fixture (zod and rules agreeing) cannot express.
 */
async function assertMemberCreateRefused(data: Record<string, unknown>): Promise<void> {
  await seedHousehold(rulesTestEnv.env, alice);
  const recipe = rulesTestEnv.env.authenticatedContext(alice).firestore().doc(`${RECIPES_COLLECTION}/pancakes`);
  await assertFails(recipe.set(data));
}

test("collection validation: a bought Linked first Ingredient is rejected by the rules", async () => {
  await assertMemberCreateRefused(wantedBought({ Flour: true }, { name: "Flour", itemId: "flour" }));
});

test("collection validation: a bought Assumed first Ingredient is rejected by the rules", async () => {
  await assertMemberCreateRefused(wantedBought({ Salt: true }, { name: "Salt", assumed: true }));
});

test("collection validation: a boughtIngredients value that is not true is rejected", async () => {
  await assertMemberWrite("bought false", wantedBought({ Flour: false }), "reject");
});

test("isMember() gate: a Member can set a Recipe Wanted and an Ingredient bought", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(rulesTestEnv.env, "pancakes");

  const recipe = rulesTestEnv.env.authenticatedContext(alice).firestore().doc(`${RECIPES_COLLECTION}/pancakes`);
  await assertSucceeds(recipe.update({ wanted: true }));
  await assertSucceeds(recipe.update({ "boughtIngredients.Flour": true }));
});

test("isMember() gate: a non-member cannot set a Recipe Wanted or an Ingredient bought", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedRecipe(rulesTestEnv.env, "pancakes");

  const recipe = rulesTestEnv.env.authenticatedContext(uid("mallory")).firestore().doc(`${RECIPES_COLLECTION}/pancakes`);
  await assertFails(recipe.update({ wanted: true }));
  await assertFails(recipe.update({ wanted: true, "boughtIngredients.Flour": true }));
});

test("a link write on a Bought first Ingredient is accepted when it drops the Bought and refused when it keeps it", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`${RECIPES_COLLECTION}/pancakes`)
      .set({
        title: "Pancakes",
        ingredients: [{ name: "Flour" }],
        prepSteps: [],
        steps: ["Mix"],
        wanted: true,
        boughtIngredients: { Flour: true },
      });
  });

  const recipe = rulesTestEnv.env.authenticatedContext(alice).firestore().doc(`${RECIPES_COLLECTION}/pancakes`);
  const linked = [{ name: "Flour", itemId: "flour" }];
  await assertFails(recipe.update({ ingredients: linked }));
  await assertSucceeds(recipe.update({ ingredients: linked, boughtIngredients: deleteField() }));
});
