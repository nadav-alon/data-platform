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
    updateDoc: (async () => {
      throw new Error("no updateDoc expected");
    }) as unknown as RecipeWantedDeps["updateDoc"],
    FieldPath: class {} as unknown as RecipeWantedDeps["FieldPath"],
    runTransaction: (async (_db: Firestore, body: (t: unknown) => Promise<void>) =>
      body({
        get: async () => ({ data: () => data }),
        update: (_ref: unknown, fields: Record<string, unknown>) => updates.push(fields),
      })) as unknown as RecipeWantedDeps["runTransaction"],
  } as RecipeWantedDeps;
  return { deps, updates };
}

/** Deps whose `updateDoc` records the field path and value it was given, never touching a transaction. */
function fakeFieldWrites() {
  const calls: { path: string; field: string[]; value: unknown }[] = [];
  const deps = {
    doc: ((_db: Firestore, ...path: string[]) => ({ path: path.join("/") })) as unknown as RecipeWantedDeps["doc"],
    deleteField: (() => DELETE) as unknown as RecipeWantedDeps["deleteField"],
    FieldPath: class {
      readonly segments: string[];
      constructor(...segments: string[]) {
        this.segments = segments;
      }
    } as unknown as RecipeWantedDeps["FieldPath"],
    updateDoc: (async (ref: { path: string }, field: { segments: string[] }, value: unknown) => {
      calls.push({ path: ref.path, field: field.segments, value });
    }) as unknown as RecipeWantedDeps["updateDoc"],
    runTransaction: (async () => {
      throw new Error("no transaction expected");
    }) as unknown as RecipeWantedDeps["runTransaction"],
  } as RecipeWantedDeps;
  return { deps, calls };
}

const recipe = (extra: Record<string, unknown> = {}) => ({
  title: "Pancakes",
  ingredients: [
    { name: "Flour" },
    { name: "Milk", itemId: "milk" },
    { name: "Salt", assumed: true },
    { name: "Eggs", quantity: 2 },
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

test("setRecipeWanted(false) clears wanted and every Bought in the same write", async () => {
  const { deps, updates } = fakeStore(recipe({ wanted: true, boughtIngredients: { Flour: true, Eggs: true } }));
  await setRecipeWantedWith(deps, db, id, false);
  assert.deepEqual(updates, [{ wanted: DELETE, boughtIngredients: DELETE }]);
});

test("setRecipeWanted refuses an unknown and a soft-deleted Recipe", async () => {
  await assert.rejects(setRecipeWantedWith(fakeStore(undefined).deps, db, id, true), /No live Recipe/);
  const deleted = fakeStore(recipe({ deletedAt: new Date() }));
  await assert.rejects(setRecipeWantedWith(deleted.deps, db, id, true), /No live Recipe/);
  assert.deepEqual(deleted.updates, []);
});

test("setIngredientBought writes the one boughtIngredients field by name, with no transaction", async () => {
  const { deps, calls } = fakeFieldWrites();
  await setIngredientBoughtWith(deps, db, id, "Flour", true);
  await setIngredientBoughtWith(deps, db, id, "Flour", false);
  assert.deepEqual(calls, [
    { path: "recipes/pancakes", field: ["boughtIngredients", "Flour"], value: true },
    { path: "recipes/pancakes", field: ["boughtIngredients", "Flour"], value: DELETE },
  ]);
});

test("setIngredientBought keeps a dotted name as one key", async () => {
  const { deps, calls } = fakeFieldWrites();
  await setIngredientBoughtWith(deps, db, id, "Salt, 1.5 tsp", true);
  assert.deepEqual(calls[0]?.field, ["boughtIngredients", "Salt, 1.5 tsp"]);
});

test("setIngredientBought refuses an empty name, writing nothing", async () => {
  const { deps, calls } = fakeFieldWrites();
  await assert.rejects(setIngredientBoughtWith(deps, db, id, "", true), /name must not be empty/);
  assert.deepEqual(calls, []);
});
