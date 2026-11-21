import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createHouseholdServer } from "../../src/mcp/server.ts";
import { seedLocalHousehold, signedInClient } from "./mcp-client.ts";

/** Calls `tool` on a server over the signed-in Member's Firestore and parses its one JSON block. */
async function callTool(
  email: string,
  tool: string,
  args?: Record<string, unknown>,
): Promise<{ isError: boolean; json: unknown }> {
  const { db, close } = await signedInClient(email);
  const server = createHouseholdServer(db);
  const client = new Client({ name: "test", version: "0" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  try {
    await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
    const result = await client.callTool({ name: tool, arguments: args });
    const [block] = result.content as { type: string; text: string }[];
    const isError = result.isError === true;
    return { isError, json: !isError && block?.type === "text" ? JSON.parse(block.text) : undefined };
  } finally {
    await client.close();
    await server.close();
    await close();
  }
}

test("the server lists exactly the two read tools and the add tool", async () => {
  const { db, close } = await signedInClient("owner@example.com");
  const server = createHouseholdServer(db);
  const client = new Client({ name: "test", version: "0" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  try {
    await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), ["add_catalogue_item", "list_items", "list_recipes"]);
    assert.deepEqual(
      tools.filter((tool) => tool.annotations?.readOnlyHint === true).map((tool) => tool.name).sort(),
      ["list_items", "list_recipes"],
    );
  } finally {
    await client.close();
    await server.close();
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
