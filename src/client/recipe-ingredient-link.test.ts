import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteField, type Firestore } from "firebase/firestore";
import { itemId } from "../core/item.ts";
import { recipeId } from "../recipes/recipe.ts";
import { linkIngredientToItemWith, linkIngredientsToItemWith, type RecipeIngredientLinkDeps } from "./recipe-ingredient-link.ts";

const db = { name: "fake-db" } as unknown as Firestore;
const id = recipeId("pancakes");

/** Deps over one stored Recipe `data` (or none); `updates` collects what was written. */
function fakeStore(data: Record<string, unknown> | undefined) {
  const updates: Record<string, unknown>[] = [];
  const deps = {
    doc: ((_db: Firestore, ...path: string[]) => ({ path: path.join("/") })) as unknown as RecipeIngredientLinkDeps["doc"],
    getDoc: (async () => ({ data: () => data })) as unknown as RecipeIngredientLinkDeps["getDoc"],
    updateDoc: (async (_ref: unknown, fields: Record<string, unknown>) => {
      updates.push(fields);
    }) as unknown as RecipeIngredientLinkDeps["updateDoc"],
  } as RecipeIngredientLinkDeps;
  return { deps, updates };
}

const recipe = (extra: Record<string, unknown> = {}) => ({
  title: "Pancakes",
  ingredients: [
    { name: "Flour", quantity: 200 },
    { name: "Milk", itemId: "milk" },
    { name: "Salt", assumed: true },
  ],
  prepSteps: [],
  steps: ["Mix"],
  ...extra,
});

test("linkIngredientToItem links the seen Unlinked Ingredient and leaves the others", async () => {
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

test("linkIngredientToItem drops the linked Ingredient's Bought and keeps the others", async () => {
  const { deps, updates } = fakeStore(
    recipe({
      wanted: true,
      ingredients: [{ name: "Flour" }, { name: "Sugar" }],
      boughtIngredients: { Flour: true, Sugar: true },
    }),
  );
  await linkIngredientToItemWith(deps, db, id, { position: 0, name: "Flour" }, itemId("flour"));
  assert.deepEqual(updates[0]?.boughtIngredients, { Sugar: true });
});

test("linkIngredientToItem deletes boughtIngredients when it held only the linked Ingredient", async () => {
  const { deps, updates } = fakeStore(
    recipe({ wanted: true, ingredients: [{ name: "Flour" }], boughtIngredients: { Flour: true } }),
  );
  await linkIngredientToItemWith(deps, db, id, { position: 0, name: "Flour" }, itemId("flour"));
  assert.deepEqual(updates[0]?.boughtIngredients, deleteField());
});

test("linkIngredientToItem keeps a Bought another Unlinked Ingredient of the same name still carries", async () => {
  const { deps, updates } = fakeStore(
    recipe({ wanted: true, ingredients: [{ name: "Flour" }, { name: "Flour" }], boughtIngredients: { Flour: true } }),
  );
  await linkIngredientToItemWith(deps, db, id, { position: 0, name: "Flour" }, itemId("flour"));
  assert.equal("boughtIngredients" in (updates[0] ?? {}), false);
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

test("linkIngredientToItem compares only the name: a swap of two same-named Ingredients is not detected", async () => {
  const { deps, updates } = fakeStore(
    recipe({
      ingredients: [
        { name: "Flour", quantity: 500, prepNote: "topping" },
        { name: "Sugar" },
        { name: "Flour", quantity: 200, prepNote: "dough" },
      ],
    }),
  );
  // The caller saw the dough Flour at position 0; the two Flours have since swapped.
  await linkIngredientToItemWith(deps, db, id, { position: 0, name: "Flour" }, itemId("flour"));
  assert.deepEqual(updates[0]?.ingredients, [
    { name: "Flour", quantity: 500, prepNote: "topping", itemId: "flour" },
    { name: "Sugar" },
    { name: "Flour", quantity: 200, prepNote: "dough" },
  ]);
});

test("linkIngredientToItem refuses an Item id that is not a valid ItemId, writing nothing", async () => {
  const { deps, updates } = fakeStore(recipe());
  await assert.rejects(
    linkIngredientToItemWith(deps, db, id, { position: 0, name: "Flour" }, "" as ReturnType<typeof itemId>),
  );
  assert.deepEqual(updates, []);
});

test("linkIngredientsToItem links every given Ingredient in one write and drops the Bought of each name", async () => {
  const { deps, updates } = fakeStore(
    recipe({
      wanted: true,
      ingredients: [{ name: "Flour" }, { name: "Sugar" }, { name: "Flour" }, { name: "Salt" }],
      boughtIngredients: { Flour: true, Sugar: true },
    }),
  );
  await linkIngredientsToItemWith(
    deps,
    db,
    id,
    [
      { position: 0, name: "Flour" },
      { position: 2, name: "Flour" },
    ],
    itemId("flour"),
  );
  assert.deepEqual(updates, [
    {
      ingredients: [
        { name: "Flour", itemId: "flour" },
        { name: "Sugar" },
        { name: "Flour", itemId: "flour" },
        { name: "Salt" },
      ],
      boughtIngredients: { Sugar: true },
    },
  ]);
});

test("linkIngredientsToItem keeps a Bought while a same-named Ingredient stays Unlinked", async () => {
  const { deps, updates } = fakeStore(
    recipe({ wanted: true, ingredients: [{ name: "Flour" }, { name: "Flour" }], boughtIngredients: { Flour: true } }),
  );
  await linkIngredientsToItemWith(deps, db, id, [{ position: 0, name: "Flour" }], itemId("flour"));
  assert.equal("boughtIngredients" in (updates[0] ?? {}), false);
});
