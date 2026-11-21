import { test } from "node:test";
import assert from "node:assert/strict";
import { doc, getDoc } from "firebase/firestore";
import { ZodError } from "zod";
import { addCatalogueItem } from "../../src/mcp/catalogue-writer.ts";
import { seedLocalHousehold, signedInClient } from "./mcp-client.ts";

test("addCatalogueItem writes the Item and its CatalogueItem and counts the Category", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    const before = (await getDoc(doc(db, "categories", "pantry"))).data()?.referenceCount;

    const id = await addCatalogueItem(db, {
      name: "Rice",
      categoryId: "pantry",
      necessity: "important",
      shopId: "grocery",
    });

    assert.equal((await getDoc(doc(db, "items", id))).data()?.state, "enough");
    assert.equal((await getDoc(doc(db, "catalogueItems", id))).data()?.categoryId, "pantry");
    assert.equal((await getDoc(doc(db, "categories", "pantry"))).data()?.referenceCount, before + 1);
  } finally {
    await close();
  }
});

test("addCatalogueItem refuses what the schema refuses, before sending anything", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    await assert.rejects(
      addCatalogueItem(db, { name: "Rice", categoryId: "pantry", necessity: "vital" }),
      ZodError,
    );
    await assert.rejects(
      addCatalogueItem(db, { name: "Rice", categoryId: "", necessity: "important" }),
      ZodError,
    );
  } finally {
    await close();
  }
});

test("addCatalogueItem as a non-Member is refused by the rules", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("stranger@example.com");
  try {
    await assert.rejects(
      addCatalogueItem(db, { name: "Rice", categoryId: "pantry", necessity: "important" }),
      { code: "permission-denied" },
    );
  } finally {
    await close();
  }
});
