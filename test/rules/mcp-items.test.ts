import { test } from "node:test";
import assert from "node:assert/strict";
import { readItems } from "../../src/mcp/household-reader.ts";
import { seedLocalHousehold, signedInClient } from "./mcp-client.ts";

test("readItems returns each live Item with its State and leaves soft-deleted ones out", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    const items = await readItems(db);

    const byId = Object.fromEntries(items.map((item) => [item.id, item.state]));
    assert.deepEqual(byId, {
      flour: "enough",
      milk: "enough",
      eggs: "enough",
      butter: "running low",
      sugar: "out",
      tomatoes: "out",
    });
    assert.ok(items.every((item) => item.deletedAt === undefined));
  } finally {
    await close();
  }
});
