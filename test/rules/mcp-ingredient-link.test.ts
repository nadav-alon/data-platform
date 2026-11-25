import { test } from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";
import { readRecipes } from "../../src/mcp/household-reader.ts";
import { setIngredientBought, setRecipeWanted } from "../../src/client/index.ts";
import { doc, getDoc } from "firebase/firestore";
import { RECIPES_COLLECTION, recipeId } from "../../src/recipes/recipe.ts";
import { setIngredientLink, type IngredientLink } from "../../src/mcp/ingredient-writer.ts";
import { connectedMcpClient, seedLocalHousehold, signedInClient } from "./mcp-client.ts";

async function ingredientsOf(db: Parameters<typeof readRecipes>[0], id: string) {
  return (await readRecipes(db)).find((recipe) => recipe.id === id)?.ingredients;
}

test("setIngredientLink links an unlinked Ingredient to an Item and keeps its other fields", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    await setIngredientLink(db, { recipeId: "banana-bread", ingredient: 0, link: { itemId: "milk" } });

    const bananas = (await ingredientsOf(db, "banana-bread"))?.[0];
    assert.equal(bananas?.item?.id, "milk");
    assert.equal(bananas?.name, "Bananas");
    assert.equal(bananas?.quantity, 3);
    assert.equal(bananas?.prepNote, "very ripe");
  } finally {
    await close();
  }
});

test("setIngredientLink marks an Ingredient Assumed, dropping its Item", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    await setIngredientLink(db, { recipeId: "pancakes", ingredient: 1, link: { assumed: true } });

    const milk = (await ingredientsOf(db, "pancakes"))?.[1];
    assert.equal(milk?.assumed, true);
    assert.equal(milk?.itemId, undefined);
    assert.equal(milk?.item, null);
  } finally {
    await close();
  }
});

test("setIngredientLink unlinks a linked and an Assumed Ingredient", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    await setIngredientLink(db, { recipeId: "pancakes", ingredient: 0, link: {} });
    await setIngredientLink(db, { recipeId: "scrambled-eggs", ingredient: 1, link: {} });

    const flour = (await ingredientsOf(db, "pancakes"))?.[0];
    assert.equal(flour?.itemId, undefined);
    assert.equal(flour?.item, null);
    const salt = (await ingredientsOf(db, "scrambled-eggs"))?.[1];
    assert.equal(salt?.assumed, undefined);
    assert.equal(salt?.itemId, undefined);
  } finally {
    await close();
  }
});

test("setIngredientLink refuses what the schema rejects, and writes nothing", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    const before = await ingredientsOf(db, "pancakes");

    const badLinks: unknown[] = [{ itemId: "" }, { itemId: "milk", assumed: true }, { assumed: false }];
    for (const link of badLinks) {
      await assert.rejects(
        setIngredientLink(db, { recipeId: "pancakes", ingredient: 0, link: link as IngredientLink }),
        ZodError,
      );
    }
    await assert.rejects(
      setIngredientLink(db, { recipeId: "pancakes", ingredient: -1, link: {} }),
      ZodError,
    );
    await assert.rejects(setIngredientLink(db, { recipeId: "pancakes", ingredient: 9, link: {} }), {
      message: /has no Ingredient 9/,
    });
    await assert.rejects(setIngredientLink(db, { recipeId: "retired-stew", ingredient: 0, link: {} }), {
      message: /No live Recipe/,
    });

    assert.deepEqual(await ingredientsOf(db, "pancakes"), before);
  } finally {
    await close();
  }
});

test("setIngredientLink by a non-Member is refused (at the Recipe read, so the update rule is not reached)", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("stranger@example.com");
  try {
    await assert.rejects(
      setIngredientLink(db, { recipeId: "pancakes", ingredient: 0, link: {} }),
      { code: "permission-denied" },
    );
  } finally {
    await close();
  }
});

test("the set_ingredient_link tool updates an Ingredient, and returns an error result for one the schema refuses", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  const { client, close: closeMcp } = await connectedMcpClient(db);
  try {
    const done = await client.callTool({
      name: "set_ingredient_link",
      arguments: { recipeId: "omelette", ingredient: 1, link: { itemId: "butter" } },
    });
    assert.notEqual(done.isError, true);
    assert.equal((await ingredientsOf(db, "omelette"))?.[1]?.item?.id, "butter");

    const refused = await client.callTool({
      name: "set_ingredient_link",
      arguments: { recipeId: "omelette", ingredient: 0, link: { itemId: "milk", assumed: true } },
    });
    assert.equal(refused.isError, true);
    assert.equal((await ingredientsOf(db, "omelette"))?.[0]?.item?.id, "eggs");
  } finally {
    await closeMcp();
    await close();
  }
});

async function boughtOf(db: Parameters<typeof readRecipes>[0], id: string) {
  const data = (await getDoc(doc(db, RECIPES_COLLECTION, id))).data();
  return data?.boughtIngredients as Record<string, true> | undefined;
}

async function nameOfFirst(db: Parameters<typeof readRecipes>[0]): Promise<string> {
  const name = (await ingredientsOf(db, "banana-bread"))?.[0]?.name;
  assert.equal(typeof name, "string");
  return name as string;
}

async function isBought(db: Parameters<typeof readRecipes>[0]): Promise<boolean> {
  const name = await nameOfFirst(db);
  return (await boughtOf(db, "banana-bread"))?.[name] === true;
}

async function boughtBananaBread(db: Parameters<typeof readRecipes>[0]) {
  await setRecipeWanted(db, recipeId("banana-bread"), true);
  await setIngredientBought(db, recipeId("banana-bread"), await nameOfFirst(db), true);
  assert.equal(await isBought(db), true);
}

test("setIngredientLink drops bought when it links or assumes a bought Ingredient", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    await boughtBananaBread(db);
    await setIngredientLink(db, { recipeId: "banana-bread", ingredient: 0, link: { itemId: "milk" } });
    assert.equal(await isBought(db), false);

    await setIngredientLink(db, { recipeId: "banana-bread", ingredient: 0, link: {} });
    await boughtBananaBread(db);
    await setIngredientLink(db, { recipeId: "banana-bread", ingredient: 0, link: { assumed: true } });
    const assumed = (await ingredientsOf(db, "banana-bread"))?.[0];
    assert.equal(assumed?.assumed, true);
    assert.equal(await isBought(db), false);
  } finally {
    await close();
  }
});

test("setIngredientLink keeps bought when it unlinks an Ingredient", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    await boughtBananaBread(db);
    await setIngredientLink(db, { recipeId: "banana-bread", ingredient: 0, link: {} });
    assert.equal(await isBought(db), true);
  } finally {
    await close();
  }
});
