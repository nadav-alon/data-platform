import { test } from "node:test";
import assert from "node:assert/strict";
import type { Firestore } from "firebase/firestore";
import { itemId } from "../core/item.ts";
import { recipeId } from "../recipes/recipe.ts";
import { linkIngredientToItemWith, type RecipeIngredientLinkDeps } from "./recipe-ingredient-link.ts";

const db = { name: "fake-db" } as unknown as Firestore;
const id = recipeId("pancakes");

/** Deps over one stored Recipe `data` (or none); `updates` collects what the transaction wrote. */
function fakeStore(data: Record<string, unknown> | undefined) {
  const updates: Record<string, unknown>[] = [];
  const deps = {
    doc: ((_db: Firestore, ...path: string[]) => ({ path: path.join("/") })) as unknown as RecipeIngredientLinkDeps["doc"],
    runTransaction: (async (_db: Firestore, body: (t: unknown) => Promise<void>) =>
      body({
        get: async () => ({ data: () => data }),
        update: (_ref: unknown, fields: Record<string, unknown>) => updates.push(fields),
      })) as unknown as RecipeIngredientLinkDeps["runTransaction"],
  } as RecipeIngredientLinkDeps;
  return { deps, updates };
}

const recipe = (extra: Record<string, unknown> = {}) => ({
  title: "Pancakes",
  ingredients: [
    { name: "Flour", quantity: 200, bought: true },
    { name: "Milk", itemId: "milk" },
    { name: "Salt", assumed: true },
  ],
  prepSteps: [],
  steps: ["Mix"],
  ...extra,
});

test("linkIngredientToItem links the seen Unlinked Ingredient, clearing bought, and leaves the others", async () => {
  const { deps, updates } = fakeStore(recipe());
  await linkIngredientToItemWith(deps, db, id, { position: 0, name: "Flour" }, itemId("flour"));
  assert.deepEqual(updates, [
    {
      ingredients: [
        { name: "Flour", quantity: 200, itemId: "flour" },
        { name: "Milk", itemId: "milk" },
        { name: "Salt", assumed: true },
      ],
    },
  ]);
});

test("linkIngredientToItem refuses a Linked and an Assumed Ingredient, changing nothing", async () => {
  const { deps, updates } = fakeStore(recipe());
  await assert.rejects(
    linkIngredientToItemWith(deps, db, id, { position: 1, name: "Milk" }, itemId("m")),
    /not unlinked/,
  );
  await assert.rejects(
    linkIngredientToItemWith(deps, db, id, { position: 2, name: "Salt" }, itemId("s")),
    /not unlinked/,
  );
  assert.deepEqual(updates, []);
});

test("linkIngredientToItem refuses when the position no longer holds the Ingredient the caller saw", async () => {
  const { deps, updates } = fakeStore(recipe());
  await assert.rejects(
    linkIngredientToItemWith(deps, db, id, { position: 0, name: "Sugar" }, itemId("sugar")),
    /no longer "Sugar"/,
  );
  await assert.rejects(
    linkIngredientToItemWith(deps, db, id, { position: 9, name: "Flour" }, itemId("flour")),
    /no Ingredient 9/,
  );
  assert.deepEqual(updates, []);
});

test("linkIngredientToItem refuses a bad position, an unknown and a soft-deleted Recipe", async () => {
  const { deps, updates } = fakeStore(recipe());
  await assert.rejects(
    linkIngredientToItemWith(deps, db, id, { position: -1, name: "Flour" }, itemId("f")),
    /non-negative integer/,
  );
  await assert.rejects(
    linkIngredientToItemWith(fakeStore(undefined).deps, db, id, { position: 0, name: "Flour" }, itemId("f")),
    /No live Recipe/,
  );
  const deleted = fakeStore(recipe({ deletedAt: new Date() }));
  await assert.rejects(
    linkIngredientToItemWith(deleted.deps, db, id, { position: 0, name: "Flour" }, itemId("f")),
    /No live Recipe/,
  );
  assert.deepEqual([...updates, ...deleted.updates], []);
});
