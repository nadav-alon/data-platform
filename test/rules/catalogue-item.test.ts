import { test } from "node:test";
import { assertFails } from "@firebase/rules-unit-testing";
import { CATALOGUE_ITEMS_COLLECTION, catalogueItemSchema } from "../../src/catalogue/catalogue-item.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");

const rulesTestEnv = setupRulesTestEnv();

test("collection validation: a Member creating a CatalogueItem with only the required fields is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "CatalogueItem with categoryId and necessity",
    collection: CATALOGUE_ITEMS_COLLECTION,
    schema: catalogueItemSchema,
    doc: { id: "dish-soap", data: { categoryId: "cleaning", necessity: "essential" } },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating a CatalogueItem with a shopId override is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "CatalogueItem with a shopId override",
    collection: CATALOGUE_ITEMS_COLLECTION,
    schema: catalogueItemSchema,
    doc: {
      id: "dish-soap",
      data: { categoryId: "cleaning", necessity: "essential", shopId: "grocery" },
    },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating a CatalogueItem with a non-string categoryId is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "CatalogueItem with a non-string categoryId",
    collection: CATALOGUE_ITEMS_COLLECTION,
    schema: catalogueItemSchema,
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
    schema: catalogueItemSchema,
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
    schema: catalogueItemSchema,
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
    schema: catalogueItemSchema,
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
    schema: catalogueItemSchema,
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
