import { test } from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { readRecipes } from "../../src/mcp/household-reader.ts";
import { addRecipe, type NewRecipe } from "../../src/mcp/recipe-writer.ts";
import { createHouseholdServer } from "../../src/mcp/server.ts";
import { seedLocalHousehold, signedInClient } from "./mcp-client.ts";

const pancakes: NewRecipe = {
  title: "Pancakes",
  ingredients: [
    { name: "Flour", itemId: "flour", quantity: 200, unit: "g" },
    { name: "Salt", assumed: true },
  ],
  prepSteps: ["Sift the flour"],
  steps: ["Mix", "Fry"],
  servings: 4,
  sourceUrl: "https://example.com/pancakes",
};

test("addRecipe stores a live Recipe that readRecipes then returns", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    const id = await addRecipe(db, pancakes);

    const stored = (await readRecipes(db)).find((recipe) => recipe.id === id);
    assert.equal(stored?.title, "Pancakes");
    assert.equal(stored?.servings, 4);
    assert.equal(stored?.ingredients[0]?.item?.id, "flour");
    assert.equal(stored?.ingredients[1]?.assumed, true);
  } finally {
    await close();
  }
});

test("addRecipe refuses a Recipe the schema rejects, and writes nothing", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    const before = (await readRecipes(db)).length;

    await assert.rejects(
      addRecipe(db, { ...pancakes, ingredients: [{ name: "Flour", unit: "g" }] }),
      ZodError,
    );

    assert.equal((await readRecipes(db)).length, before);
  } finally {
    await close();
  }
});

test("addRecipe by a non-Member is refused by the rules", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("stranger@example.com");
  try {
    await assert.rejects(addRecipe(db, pancakes), { code: "permission-denied" });
  } finally {
    await close();
  }
});

test("the add_recipe tool adds a Recipe, and returns an error result for one the schema refuses", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  const server = createHouseholdServer(db);
  const client = new Client({ name: "test", version: "0" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  try {
    await Promise.all([server.connect(serverSide), client.connect(clientSide)]);

    const added = await client.callTool({ name: "add_recipe", arguments: pancakes });
    assert.notEqual(added.isError, true);
    assert.ok((await readRecipes(db)).some((recipe) => recipe.title === "Pancakes"));

    const refused = await client.callTool({
      name: "add_recipe",
      arguments: { ...pancakes, title: "Bad", servings: 0 },
    });
    assert.equal(refused.isError, true);
    assert.ok(!(await readRecipes(db)).some((recipe) => recipe.title === "Bad"));
  } finally {
    await client.close();
    await server.close();
    await close();
  }
});
