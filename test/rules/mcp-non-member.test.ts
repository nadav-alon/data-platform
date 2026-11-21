import { test } from "node:test";
import assert from "node:assert/strict";
import { readItems, readRecipes } from "../../src/mcp/household-reader.ts";
import { isRulesRefusal } from "../../src/client/rules-refusal.ts";
import { seedLocalHousehold, signedInClient } from "./mcp-client.ts";

test("a signed-in non-Member's reads are refused by the rules", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("stranger@example.com");
  try {
    await assert.rejects(readItems(db), isRulesRefusal);
    await assert.rejects(readRecipes(db), isRulesRefusal);
  } finally {
    await close();
  }
});
