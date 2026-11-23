import { test } from "node:test";
import assert from "node:assert/strict";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, type Firestore } from "firebase/firestore";
import { shopId, type ShopId } from "../../src/catalogue/shop.ts";
import {
  setRecipeIngredientShop,
  UnknownShopError,
  watchRecipeIngredientShop,
} from "../../src/client/index.ts";
import { HOUSEHOLD_SETTINGS_DOC_PATH } from "../../src/recipes/household-settings.ts";
import { seedLocalHousehold, signedInClient } from "./mcp-client.ts";

const grocery = shopId("grocery");

/** Resolves with the next value `watchRecipeIngredientShop` reports that satisfies `wanted`. */
function nextShop(
  db: Firestore,
  wanted: (value: ShopId | undefined) => boolean,
): { settled: Promise<ShopId | undefined>; stop: () => void } {
  let stop = () => {};
  const settled = new Promise<ShopId | undefined>((resolve, reject) => {
    stop = watchRecipeIngredientShop(
      db,
      (value) => {
        if (wanted(value)) resolve(value);
      },
      reject,
    );
  });
  return { settled, stop };
}

test("a Member sets the Shop for Recipe Ingredients, reads it live, and clears it", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    const unset = nextShop(db, (value) => value === undefined);
    assert.equal(await unset.settled, undefined);

    const set = nextShop(db, (value) => value === grocery);
    await setRecipeIngredientShop(db, grocery);
    assert.equal(await set.settled, grocery);
    set.stop();

    const cleared = nextShop(db, (value) => value === undefined);
    await setRecipeIngredientShop(db, undefined);
    assert.equal(await cleared.settled, undefined);
    cleared.stop();
    unset.stop();
  } finally {
    await close();
  }
});

test("setting a Shop that does not exist in the Household is refused and writes nothing", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    await assert.rejects(setRecipeIngredientShop(db, shopId("nowhere")), UnknownShopError);
    assert.equal((await getDoc(doc(db, HOUSEHOLD_SETTINGS_DOC_PATH))).exists(), false);
  } finally {
    await close();
  }
});

test("setting a soft-deleted Shop is refused", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    const old = doc(db, "shops/old");
    await setDoc(old, { name: "Old", referenceCount: 0 });
    await updateDoc(old, { deletedAt: serverTimestamp() });
    await assert.rejects(setRecipeIngredientShop(db, shopId("old")), UnknownShopError);
  } finally {
    await close();
  }
});

test("a non-member's set is refused by the rules", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("stranger@example.com");
  try {
    await assert.rejects(setRecipeIngredientShop(db, undefined), { code: "permission-denied" });
  } finally {
    await close();
  }
});

test("setting and clearing the Shop keeps an unrelated setting", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    const settings = doc(db, HOUSEHOLD_SETTINGS_DOC_PATH);
    await setDoc(settings, { other: "kept" });
    await setRecipeIngredientShop(db, grocery);
    assert.deepEqual((await getDoc(settings)).data(), { other: "kept", recipeIngredientShopId: grocery });
    await setRecipeIngredientShop(db, undefined);
    assert.deepEqual((await getDoc(settings)).data(), { other: "kept" });
  } finally {
    await close();
  }
});

test("the watch reports undefined once the named Shop is soft-deleted", async () => {
  await seedLocalHousehold("owner-with-recipes");
  const { db, close } = await signedInClient("owner@example.com");
  try {
    const temp = doc(db, "shops/temp");
    await setDoc(temp, { name: "Temp", referenceCount: 0 });
    await setRecipeIngredientShop(db, shopId("temp"));
    const set = nextShop(db, (value) => value === shopId("temp"));
    assert.equal(await set.settled, shopId("temp"));
    const gone = nextShop(db, (value) => value === undefined);
    await updateDoc(temp, { deletedAt: serverTimestamp() });
    assert.equal(await gone.settled, undefined);
    set.stop();
    gone.stop();
  } finally {
    await close();
  }
});
