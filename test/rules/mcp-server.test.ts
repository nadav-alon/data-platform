import { test } from "node:test";
import assert from "node:assert/strict";
import { connectedMcpClient, seedLocalHousehold, signedInClient } from "./mcp-client.ts";

/** Calls `tool` on a server over the signed-in Member's Firestore and parses its one JSON block. */
async function callTool(
  email: string,
  tool: string,
  args?: Record<string, unknown>,
): Promise<{ isError: boolean; json: unknown }> {
  const { db, close } = await signedInClient(email);
  const { client, close: closeMcp } = await connectedMcpClient(db);
  try {
    const result = await client.callTool({ name: tool, arguments: args });
    const [block] = result.content as { type: string; text: string }[];
    const isError = result.isError === true;
    return { isError, json: !isError && block?.type === "text" ? JSON.parse(block.text) : undefined };
  } finally {
    await closeMcp();
    await close();
  }
}

test("the server lists the three read tools, read only, and the five write tools, which are not", async () => {
  const { db, close } = await signedInClient("owner@example.com");
  const { client, close: closeMcp } = await connectedMcpClient(db);
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [
      "add_catalogue_item",
      "add_food",
      "add_recipe",
      "list_foods",
      "list_items",
      "list_recipes",
      "set_ingredient_link",
      "set_item_state",
    ]);
    for (const tool of tools) {
      assert.equal(tool.annotations?.readOnlyHint, tool.name.startsWith("list_"), tool.name);
    }
  } finally {
    await closeMcp();
    await close();
  }
});

test("list_items and list_recipes return the raw live records as JSON", async () => {
  await seedLocalHousehold("owner-with-recipes");

  const items = await callTool("owner@example.com", "list_items");
  const recipes = await callTool("owner@example.com", "list_recipes");

  assert.equal(items.isError, false);
  assert.deepEqual(
    (items.json as { id: string }[]).map((item) => item.id).sort(),
    ["butter", "eggs", "flour", "milk", "sugar", "tomatoes"],
  );
  const shortbread = (recipes.json as { id: string; ingredients: { item: { state: string } }[] }[]).find(
    (recipe) => recipe.id === "shortbread",
  );
  assert.equal(shortbread?.ingredients[1]?.item.state, "running low");
});

test("list_foods returns every live Food with its place and perServing, and leaves out a soft-deleted one", async () => {
  await seedLocalHousehold("owner-with-foods");

  const foods = await callTool("owner@example.com", "list_foods");

  assert.equal(foods.isError, false);
  const list = foods.json as { id: string; place?: string; perServing: { kcal: number } }[];
  assert.deepEqual(list.map((food) => food.id).sort(), ["falafel-pita", "protein-bar", "schnitzel-plate"]);
  const schnitzel = list.find((food) => food.id === "schnitzel-plate");
  assert.equal(schnitzel?.place, "work canteen");
  assert.equal(schnitzel?.perServing.kcal, 720);
});

test("add_food adds a Food that list_foods then returns, with estimated kept; a refusal is an error result", async () => {
  await seedLocalHousehold("owner-with-foods");
  const perServing = { kcal: 650, proteinG: 30, carbsG: 70, fatG: 25 };

  const refused = await callTool("owner@example.com", "add_food", {
    name: "Shawarma",
    perServing: { ...perServing, kcal: -1 },
  });
  const added = await callTool("owner@example.com", "add_food", {
    name: "Shawarma",
    place: "night market",
    servingLabel: "1 laffa",
    perServing,
    estimated: true,
  });
  const foods = await callTool("owner@example.com", "list_foods");

  assert.equal(refused.isError, true);
  assert.equal(added.isError, false);
  const { id } = added.json as { id: string };
  const saved = (foods.json as { id: string; place?: string; estimated?: true; perServing: unknown }[]).find(
    (food) => food.id === id,
  );
  assert.equal(saved?.place, "night market");
  assert.equal(saved?.estimated, true);
  assert.deepEqual(saved?.perServing, perServing);
});

test("add_food's description tells Claude to save an estimate with estimated: true", async () => {
  const { db, close } = await signedInClient("owner@example.com");
  const { client, close: closeMcp } = await connectedMcpClient(db);
  try {
    const { tools } = await client.listTools();
    assert.match(tools.find((tool) => tool.name === "add_food")?.description ?? "", /estimated: true/);
  } finally {
    await closeMcp();
    await close();
  }
});

test("a non-Member's tool call is an error result, with no records", async () => {
  await seedLocalHousehold("owner-with-recipes");

  const result = await callTool("stranger@example.com", "list_items");

  assert.equal(result.isError, true);
});

test("add_catalogue_item adds an Item that list_items then returns; a schema refusal is an error result", async () => {
  await seedLocalHousehold("owner-with-recipes");

  const refused = await callTool("owner@example.com", "add_catalogue_item", {
    name: "Rice",
    categoryId: "pantry",
    necessity: "vital",
  });
  const added = await callTool("owner@example.com", "add_catalogue_item", {
    name: "Rice",
    categoryId: "pantry",
    necessity: "important",
  });
  const items = await callTool("owner@example.com", "list_items");

  assert.equal(refused.isError, true);
  assert.equal(added.isError, false);
  const { id } = added.json as { id: string };
  assert.ok((items.json as { id: string }[]).some((item) => item.id === id));
});
