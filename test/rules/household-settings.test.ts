import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { shopId } from "../../src/catalogue/shop.ts";
import { HOUSEHOLD_SETTINGS_DOC_PATH } from "../../src/recipes/household-settings.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold, seedShop } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const mallory = uid("mallory");
const grocery = shopId("grocery");

const rulesTestEnv = setupRulesTestEnv();

async function assertMemberWrite(
  name: string,
  data: Record<string, unknown>,
  expected: RulesFixture["expected"],
): Promise<void> {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, grocery, 0);
  await assertFixture(
    { name, collection: "meta", doc: { id: "settings", data }, auth: { uid: alice }, expected },
    rulesTestEnv.env,
  );
}

test("household settings: a Member setting a live Shop for Recipe Ingredients is accepted", async () => {
  await assertMemberWrite("live Shop", { recipeIngredientShopId: "grocery" }, "accept");
});

test("household settings: a Member writing settings with no Shop (clearing it) is accepted", async () => {
  await assertMemberWrite("no Shop", {}, "accept");
});

// Whether a Shop exists is state the schema cannot see, so these are pinned against the rules alone.
test("household settings: a Shop that does not exist in the Household is rejected", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const db = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(db.doc(HOUSEHOLD_SETTINGS_DOC_PATH).set({ recipeIngredientShopId: "nowhere" }));
});

test("household settings: a soft-deleted Shop is rejected", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, grocery, 0, { deleted: true });
  const db = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(db.doc(HOUSEHOLD_SETTINGS_DOC_PATH).set({ recipeIngredientShopId: "grocery" }));
});

test("household settings: an empty or non-string Shop id is rejected", async () => {
  await assertMemberWrite("empty id", { recipeIngredientShopId: "" }, "reject");
  await assertMemberWrite("numeric id", { recipeIngredientShopId: 3 }, "reject");
});

test("household settings: a Member can update the Shop and read the settings back", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, grocery, 0);
  const db = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertSucceeds(db.doc(HOUSEHOLD_SETTINGS_DOC_PATH).set({ recipeIngredientShopId: "grocery" }));
  await assertSucceeds(db.doc(HOUSEHOLD_SETTINGS_DOC_PATH).set({}));
  await assertSucceeds(db.doc(HOUSEHOLD_SETTINGS_DOC_PATH).get());
});

test("household settings: a signed-in non-member can neither set nor read them", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, grocery, 0);
  const db = rulesTestEnv.env.authenticatedContext(mallory).firestore();
  await assertFails(db.doc(HOUSEHOLD_SETTINGS_DOC_PATH).set({ recipeIngredientShopId: "grocery" }));
  await assertFails(db.doc(HOUSEHOLD_SETTINGS_DOC_PATH).get());
});

test("household settings: nobody deletes them", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const db = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertSucceeds(db.doc(HOUSEHOLD_SETTINGS_DOC_PATH).set({}));
  await assertFails(db.doc(HOUSEHOLD_SETTINGS_DOC_PATH).delete());
});
