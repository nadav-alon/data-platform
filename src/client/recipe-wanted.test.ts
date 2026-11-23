import { test } from "node:test";
import assert from "node:assert/strict";
import type { Firestore } from "firebase/firestore";
import { recipeId } from "../recipes/recipe.ts";
import {
  setIngredientBoughtWith,
  setRecipeWantedWith,
  type RecipeWantedDeps,
} from "./recipe-wanted.ts";

const db = { name: "fake-db" } as unknown as Firestore;
const id = recipeId("pancakes");
const DELETE = Symbol("deleteField");

/** Deps over one stored Recipe `data` (or none); `updates` collects what the transaction wrote. */
function fakeStore(data: Record<string, unknown> | undefined) {
  const updates: Record<string, unknown>[] = [];
  const deps = {
    doc: ((_db: Firestore, ...path: string[]) => ({ path: path.join("/") })) as unknown as RecipeWantedDeps["doc"],
    deleteField: (() => DELETE) as unknown as RecipeWantedDeps["deleteField"],
    runTransaction: (async (_db: Firestore, body: (t: unknown) => Promise<void>) =>
      body({
        get: async () => ({ data: () => data }),
        update: (_ref: unknown, fields: Record<string, unknown>) => updates.push(fields),
      })) as unknown as RecipeWantedDeps["runTransaction"],
  } as RecipeWantedDeps;
  return { deps, updates };
}

const recipe = (extra: Record<string, unknown> = {}, flourBought = true) => ({
  title: "Pancakes",
  ingredients: [
    flourBought ? { name: "Flour", bought: true } : { name: "Flour" },
    { name: "Milk", itemId: "milk" },
    { name: "Salt", assumed: true },
    { name: "Eggs", quantity: 2, bought: true },
  ],
  prepSteps: [],
  steps: ["Mix"],
  ...extra,
});

test("setRecipeWanted(true) sets wanted and nothing else", async () => {
  const { deps, updates } = fakeStore(recipe());
  await setRecipeWantedWith(deps, db, id, true);
  assert.deepEqual(updates, [{ wanted: true }]);
});

test("setRecipeWanted(false) clears wanted and every Ingredient's bought in the same write", async () => {
  const { deps, updates } = fakeStore(recipe({ wanted: true }));
  await setRecipeWantedWith(deps, db, id, false);
  assert.deepEqual(updates, [
    {
      wanted: DELETE,
      ingredients: [
        { name: "Flour" },
        { name: "Milk", itemId: "milk" },
        { name: "Salt", assumed: true },
        { name: "Eggs", quantity: 2 },
      ],
    },
  ]);
});

test("setRecipeWanted refuses an unknown and a soft-deleted Recipe", async () => {
  await assert.rejects(setRecipeWantedWith(fakeStore(undefined).deps, db, id, true), /No live Recipe/);
  const deleted = fakeStore(recipe({ deletedAt: new Date() }));
  await assert.rejects(setRecipeWantedWith(deleted.deps, db, id, true), /No live Recipe/);
  assert.deepEqual(deleted.updates, []);
});

test("setIngredientBought sets one Unlinked Ingredient bought on a Wanted Recipe", async () => {
  const { deps, updates } = fakeStore(recipe({ wanted: true }, false));
  await setIngredientBoughtWith(deps, db, id, 0, true);
  assert.deepEqual(updates, [
    {
      ingredients: [
        { name: "Flour", bought: true },
        { name: "Milk", itemId: "milk" },
        { name: "Salt", assumed: true },
        { name: "Eggs", quantity: 2, bought: true },
      ],
    },
  ]);
});

test("setIngredientBought clears one Ingredient's bought and leaves the others", async () => {
  const { deps, updates } = fakeStore(recipe({ wanted: true }));
  await setIngredientBoughtWith(deps, db, id, 3, false);
  assert.deepEqual(updates[0]?.ingredients, [
    { name: "Flour", bought: true },
    { name: "Milk", itemId: "milk" },
    { name: "Salt", assumed: true },
    { name: "Eggs", quantity: 2 },
  ]);
});

test("setIngredientBought refuses on a Recipe that is not Wanted", async () => {
  const { deps, updates } = fakeStore(recipe());
  await assert.rejects(setIngredientBoughtWith(deps, db, id, 0, true), /not Wanted/);
  assert.deepEqual(updates, []);
});

test("setIngredientBought refuses a Linked Ingredient, an Assumed one and a missing position", async () => {
  const { deps, updates } = fakeStore(recipe({ wanted: true }));
  await assert.rejects(setIngredientBoughtWith(deps, db, id, 1, true), /not Unlinked/);
  await assert.rejects(setIngredientBoughtWith(deps, db, id, 2, true), /not Unlinked/);
  await assert.rejects(setIngredientBoughtWith(deps, db, id, 9, true), /no Ingredient 9/);
  assert.deepEqual(updates, []);
});
