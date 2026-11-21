import { test } from "node:test";
import assert from "node:assert/strict";
import { recipeId } from "../../src/recipes/recipe.ts";
import { readRecipes } from "../../src/mcp/household-reader.ts";
import { seedLocalHousehold, signedInClient } from "./mcp-client.ts";

test("readRecipes returns live Recipes with Ingredients, each with its linked Item", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    const recipes = await readRecipes(db);
    const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));

    assert.ok(!byId.has(recipeId("retired-stew")), "a soft-deleted Recipe is left out");
    assert.ok(recipes.every((recipe) => recipe.deletedAt === undefined));

    const shortbread = byId.get(recipeId("shortbread"));
    assert.ok(shortbread);
    assert.equal(shortbread.title, "Shortbread");
    assert.deepEqual(
      shortbread.ingredients.map((ingredient) => [ingredient.name, ingredient.item?.state]),
      [
        ["Flour", "enough"],
        ["Butter", "running low"],
      ],
    );
    assert.equal(shortbread.ingredients[1]?.item?.id, "butter");

    const banana = byId.get(recipeId("banana-bread"));
    assert.ok(banana);
    assert.equal(banana.servings, 8);
    assert.deepEqual(banana.prepSteps, ["Heat the oven to 180C", "Grease a loaf tin"]);
    assert.equal(banana.ingredients[0]?.item, null, "an unlinked Ingredient has no Item");
    assert.equal(banana.ingredients[1]?.quantity, 250);

    const scrambled = byId.get(recipeId("scrambled-eggs"));
    assert.equal(scrambled?.ingredients[1]?.assumed, true);
    assert.equal(scrambled?.ingredients[1]?.item, null);
  } finally {
    await close();
  }
});

test("an Ingredient linked to a soft-deleted Item has no Item, and keeps its itemId", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    const spiceCake = (await readRecipes(db)).find((recipe) => recipe.id === "spice-cake");

    const cinnamon = spiceCake?.ingredients[1];
    assert.equal(cinnamon?.itemId, "cinnamon");
    assert.equal(cinnamon?.item, null);
  } finally {
    await close();
  }
});
