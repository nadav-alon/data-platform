import { test } from "node:test";
import { assertFails } from "@firebase/rules-unit-testing";
import { CATEGORIES_COLLECTION } from "../../src/catalogue/category.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");

const rulesTestEnv = setupRulesTestEnv();

test("collection validation: a Member creating a Category with a name, default Shop and referenceCount 0 is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Category with name and defaultShopId",
    collection: CATEGORIES_COLLECTION,
    doc: {
      id: "medicine",
      data: { name: "Medicine", defaultShopId: "pharmacy", referenceCount: 0 },
    },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, rulesTestEnv.env);
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
