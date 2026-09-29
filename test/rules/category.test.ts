import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { CATEGORIES_COLLECTION } from "../../src/catalogue/category.ts";
import { SHOPS_COLLECTION } from "../../src/catalogue/shop.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");

const rulesTestEnv = setupRulesTestEnv();

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

test("reference count: creating a Category batched with its default Shop's referenceCount bump is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, "pharmacy", 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), {
    name: "Medicine",
    defaultShopId: "pharmacy",
    referenceCount: 0,
  });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
});

test("reference count: creating a Category without also bumping its default Shop's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, "pharmacy", 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${CATEGORIES_COLLECTION}/medicine`).set({
      name: "Medicine",
      defaultShopId: "pharmacy",
      referenceCount: 0,
    }),
  );
});

test("reference count: creating a Category with the wrong Shop referenceCount delta is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, "pharmacy", 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), {
    name: "Medicine",
    defaultShopId: "pharmacy",
    referenceCount: 0,
  });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 2 });
  await assertFails(batch.commit());
});

test("reference count: creating a Category whose default Shop doesn't exist is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${CATEGORIES_COLLECTION}/medicine`).set({
      name: "Medicine",
      defaultShopId: "pharmacy",
      referenceCount: 0,
    }),
  );
});

test("collection validation: a Member creating a Category with a non-string name is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Category with a non-string name",
    collection: CATEGORIES_COLLECTION,
    doc: { id: "medicine", data: { name: 42, defaultShopId: "pharmacy", referenceCount: 0 } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating a Category missing its defaultShopId is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Category missing its defaultShopId",
    collection: CATEGORIES_COLLECTION,
    doc: { id: "medicine", data: { name: "Medicine", referenceCount: 0 } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member updating an existing Category to remove its defaultShopId is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${CATEGORIES_COLLECTION}/medicine`).set({
      name: "Medicine",
      defaultShopId: "pharmacy",
      referenceCount: 0,
    });
  });

  const fixture: RulesFixture = {
    name: "Category update missing its defaultShopId",
    collection: CATEGORIES_COLLECTION,
    doc: { id: "medicine", data: { name: "Medicine", referenceCount: 0 } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating a Category with an empty name is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Category with an empty name",
    collection: CATEGORIES_COLLECTION,
    doc: { id: "medicine", data: { name: "", defaultShopId: "pharmacy", referenceCount: 0 } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating a Category missing its referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Category missing its referenceCount",
    collection: CATEGORIES_COLLECTION,
    doc: { id: "medicine", data: { name: "Medicine", defaultShopId: "pharmacy" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("new-doc invariant: a Member creating a Category with a nonzero referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${CATEGORIES_COLLECTION}/medicine`).set({
      name: "Medicine",
      defaultShopId: "pharmacy",
      referenceCount: 1,
    }),
  );
});

test("isMember() gate: a signed-in non-member creating a Category is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(uid("mallory"));
  await assertFails(
    context.firestore().doc(`${CATEGORIES_COLLECTION}/medicine`).set({
      name: "Medicine",
      defaultShopId: "pharmacy",
    }),
  );
});
