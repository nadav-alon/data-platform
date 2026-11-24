import { test } from "node:test";
import assert from "node:assert/strict";
import { getAuth } from "firebase/auth";
import { doc, getDoc, type Firestore } from "firebase/firestore";
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

test("the server lists the three read tools, read only, and the six write tools, which are not", async () => {
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
      "log_food",
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

/** The Log Entry `id` in the signed-in Member's own log, as stored. */
async function storedEntry(db: Firestore, id: string): Promise<Record<string, any> | undefined> {
  const owner = getAuth(db.app).currentUser?.uid ?? "";
  return (await getDoc(doc(db, "nutritionLogs", owner, "entries", id))).data();
}

async function logAsOwner(args: Record<string, unknown>) {
  await seedLocalHousehold("owner-with-foods");
  const { db, close } = await signedInClient("owner@example.com");
  const { client, close: closeMcp } = await connectedMcpClient(db);
  try {
    const result = await client.callTool({ name: "log_food", arguments: args });
    const [block] = result.content as { text: string }[];
    const id = result.isError === true ? undefined : (JSON.parse(block?.text ?? "{}") as { id: string }).id;
    return { isError: result.isError === true, entry: id === undefined ? undefined : await storedEntry(db, id) };
  } finally {
    await closeMcp();
    await close();
  }
}

test("log_food from a foodId snapshots the Food's name and its per-serving Nutrition times servings", async () => {
  const { isError, entry } = await logAsOwner({
    foodId: "schnitzel-plate",
    servings: 1.5,
    eatenAt: "2026-11-24T13:00:00",
  });

  assert.equal(isError, false);
  assert.deepEqual(entry?.source, { kind: "food", foodId: "schnitzel-plate" });
  assert.equal(entry?.name, "Chicken schnitzel plate");
  assert.equal(entry?.servings, 1.5);
  assert.deepEqual(entry?.nutrition, { kcal: 1080, proteinG: 57, carbsG: 96, fatG: 49.5 });
  assert.equal(entry?.mealType, "lunch", "guessed from eatenAt's local time");
  assert.equal(entry?.eatenAt.toDate().getHours(), 13);
});

test("log_food defaults servings to 1 and eatenAt to now, and takes an explicit mealType over the guess", async () => {
  const before = Date.now();
  const { entry } = await logAsOwner({ foodId: "protein-bar", mealType: "snack" });

  assert.equal(entry?.servings, 1);
  assert.equal(entry?.mealType, "snack");
  assert.ok(entry?.eatenAt.toMillis() >= before - 1000 && entry?.eatenAt.toMillis() <= Date.now() + 1000);
});

test("log_food of a quick name and Nutrition logs a quick entry", async () => {
  const { isError, entry } = await logAsOwner({
    name: "Street corn",
    nutrition: { kcal: 200, proteinG: 5, carbsG: 30, fatG: 8 },
    servings: 2,
    eatenAt: "2026-11-24T22:00:00",
  });

  assert.equal(isError, false);
  assert.deepEqual(entry?.source, { kind: "quick" });
  assert.equal(entry?.name, "Street corn");
  assert.deepEqual(entry?.nutrition, { kcal: 400, proteinG: 10, carbsG: 60, fatG: 16 });
  assert.equal(entry?.mealType, "snack");
});

test("log_food refuses a soft-deleted or missing Food, no source, or both sources", async () => {
  const nutrition = { kcal: 1, proteinG: 1, carbsG: 1, fatG: 1 };
  for (const args of [
    { foodId: "old-salad" },
    { foodId: "no-such-food" },
    {},
    { name: "Only a name" },
    { foodId: "protein-bar", name: "Both", nutrition },
    { foodId: "protein-bar", servings: 0 },
  ]) {
    assert.equal((await logAsOwner(args)).isError, true, JSON.stringify(args));
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
