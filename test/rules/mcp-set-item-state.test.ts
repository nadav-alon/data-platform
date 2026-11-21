import { test } from "node:test";
import assert from "node:assert/strict";
import { collection, getDoc, getDocs, doc, type Firestore } from "firebase/firestore";
import { ITEMS_COLLECTION, itemId } from "../../src/core/item.ts";
import {
  stateHistoryCollectionPath,
  stateHistoryEntrySchema,
} from "../../src/core/state-history.ts";
import { connectedMcpClient, seedLocalHousehold, signedInClient } from "./mcp-client.ts";

/** Calls `set_item_state` through an MCP client on a server over `db`; returns the raw result. */
async function callSetItemState(db: Firestore, args: Record<string, unknown>) {
  const { client, close } = await connectedMcpClient(db);
  try {
    return await client.callTool({ name: "set_item_state", arguments: args });
  } finally {
    await close();
  }
}

test("set_item_state sets the Item's State and appends a State history entry stamped by the server", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    const result = await callSetItemState(db, { itemId: "milk", state: "out" });

    assert.notEqual(result.isError, true);
    assert.deepEqual(result.content, [{ type: "text", text: "Set milk to out." }]);
    assert.equal((await getDoc(doc(db, ITEMS_COLLECTION, "milk"))).data()?.state, "out");
    const entries = await getDocs(collection(db, stateHistoryCollectionPath(itemId("milk"))));
    const outEntries = entries.docs.map((entry) => entry.data()).filter((e) => e.state === "out");
    assert.equal(outEntries.length, 1);
    assert.ok(stateHistoryEntrySchema.safeParse(outEntries[0]).success);
  } finally {
    await close();
  }
});

test("set_item_state refuses a State the schema rejects with an error result, and writes nothing", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    const result = await callSetItemState(db, { itemId: "milk", state: "almost gone" });

    assert.equal(result.isError, true);
    assert.equal((await getDoc(doc(db, ITEMS_COLLECTION, "milk"))).data()?.state, "enough");
    const entries = await getDocs(collection(db, stateHistoryCollectionPath(itemId("milk"))));
    assert.ok(entries.docs.every((entry) => entry.data().state !== "almost gone"));
  } finally {
    await close();
  }
});
