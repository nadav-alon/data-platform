import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { CATALOGUE_ITEMS_COLLECTION } from "../../src/catalogue/catalogue-item.ts";
import { CATEGORIES_COLLECTION } from "../../src/catalogue/category.ts";
import { SHOPS_COLLECTION } from "../../src/catalogue/shop.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");

const rulesTestEnv = setupRulesTestEnv();

/** Seeds a Category directly, bypassing rules, so a test can start from a known referenceCount. */
async function seedCategory(
  testEnv: RulesTestEnvironment,
  id: string,
  referenceCount: number,
): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`${CATEGORIES_COLLECTION}/${id}`)
      .set({ name: "Category", defaultShopId: "some-shop", referenceCount });
  });
}

/** Seeds a Shop directly, bypassing rules, so a test can start from a known referenceCount. */
async function seedShop(
  testEnv: RulesTestEnvironment,
  id: string,
  referenceCount: number,
): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${SHOPS_COLLECTION}/${id}`).set({ name: "Shop", referenceCount });
  });
}

test("reference count: creating a CatalogueItem batched with its Category's referenceCount bump is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, "cleaning", 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
});

test("reference count: creating a CatalogueItem without also bumping its Category's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, "cleaning", 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
    }),
  );
});

test("reference count: creating a CatalogueItem whose Category doesn't exist is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
    }),
  );
});

test("reference count: creating a CatalogueItem with a shopId override batched with both bumps is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, "cleaning", 0);
  await seedShop(rulesTestEnv.env, "grocery", 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
    shopId: "grocery",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 1 });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
});

test("reference count: creating a CatalogueItem with a shopId override without bumping the Shop's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, "cleaning", 0);
  await seedShop(rulesTestEnv.env, "grocery", 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
    shopId: "grocery",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 1 });
  await assertFails(batch.commit());
});

test("collection validation: a Member creating a CatalogueItem with a non-string categoryId is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "CatalogueItem with a non-string categoryId",
    collection: CATALOGUE_ITEMS_COLLECTION,
    doc: { id: "dish-soap", data: { categoryId: 42, necessity: "essential" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating a CatalogueItem missing its categoryId is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "CatalogueItem missing its categoryId",
    collection: CATALOGUE_ITEMS_COLLECTION,
    doc: { id: "dish-soap", data: { necessity: "essential" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating a CatalogueItem with a necessity outside the enum is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "CatalogueItem with a necessity outside the Necessity enum",
    collection: CATALOGUE_ITEMS_COLLECTION,
    doc: { id: "dish-soap", data: { categoryId: "cleaning", necessity: "nice to have" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member updating an existing CatalogueItem into a necessity outside the enum is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
    });
  });

  const fixture: RulesFixture = {
    name: "CatalogueItem update with a necessity outside the Necessity enum",
    collection: CATALOGUE_ITEMS_COLLECTION,
    doc: { id: "dish-soap", data: { categoryId: "cleaning", necessity: "nice to have" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating a CatalogueItem with an empty shopId override is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "CatalogueItem with an empty shopId override",
    collection: CATALOGUE_ITEMS_COLLECTION,
    doc: {
      id: "dish-soap",
      data: { categoryId: "cleaning", necessity: "essential", shopId: "" },
    },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("isMember() gate: a signed-in non-member creating a CatalogueItem is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(uid("mallory"));
  await assertFails(
    context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
    }),
  );
});
