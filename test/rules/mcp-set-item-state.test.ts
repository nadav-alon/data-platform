import { test } from "node:test";
import assert from "node:assert/strict";
import { collection, getDoc, getDocs, doc } from "firebase/firestore";
import { itemId } from "../../src/core/item.ts";
import {
  stateHistoryCollectionPath,
  stateHistoryEntrySchema,
} from "../../src/core/state-history.ts";
import { SetItemStateError, setItemState } from "../../src/mcp/household-writer.ts";
import { seedLocalHousehold, signedInClient } from "./mcp-client.ts";

test("setItemState sets the Item's State and appends a State history entry stamped by the server", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    await setItemState(db, itemId("milk"), "out");

    assert.equal((await getDoc(doc(db, "items/milk"))).data()?.state, "out");
    const entries = await getDocs(collection(db, stateHistoryCollectionPath(itemId("milk"))));
    const last = entries.docs.map((entry) => entry.data()).filter((entry) => entry.state === "out");
    assert.equal(last.length, 1);
    assert.ok(stateHistoryEntrySchema.safeParse(last[0]).success);
  } finally {
    await close();
  }
});

test("setItemState refuses a State the schema rejects, and writes nothing", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    await assert.rejects(setItemState(db, itemId("milk"), "almost gone"), SetItemStateError);

    assert.equal((await getDoc(doc(db, "items/milk"))).data()?.state, "enough");
    const entries = await getDocs(collection(db, stateHistoryCollectionPath(itemId("milk"))));
    assert.ok(entries.docs.every((entry) => entry.data().state !== "almost gone"));
  } finally {
    await close();
  }
});
