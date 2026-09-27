import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { CATALOGUE_ITEMS_COLLECTION, catalogueItemSchema } from "../../src/catalogue/catalogue-item.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold } from "./seed.ts";

const alice = uid("alice");

let testEnv: RulesTestEnvironment;

before(async () => {
  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    throw new Error(
      "GCLOUD_PROJECT is not set; run this suite through `npm run test:rules`",
    );
  }

  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

test("collection validation: a Member creating a CatalogueItem with only the required fields is accepted", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "CatalogueItem with categoryId and necessity",
    collection: CATALOGUE_ITEMS_COLLECTION,
    schema: catalogueItemSchema,
    doc: { id: "dish-soap", data: { categoryId: "cleaning", necessity: "essential" } },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating a CatalogueItem with a shopId override is accepted", async () => {
  await seedHousehold(testEnv, alice);

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

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating a CatalogueItem missing its categoryId is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "CatalogueItem missing its categoryId",
    collection: CATALOGUE_ITEMS_COLLECTION,
    schema: catalogueItemSchema,
    doc: { id: "dish-soap", data: { necessity: "essential" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating a CatalogueItem with a necessity outside the enum is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "CatalogueItem with a necessity outside the Necessity enum",
    collection: CATALOGUE_ITEMS_COLLECTION,
    schema: catalogueItemSchema,
    doc: { id: "dish-soap", data: { categoryId: "cleaning", necessity: "nice to have" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member updating an existing CatalogueItem into a necessity outside the enum is denied", async () => {
  await seedHousehold(testEnv, alice);
  await testEnv.withSecurityRulesDisabled(async (context) => {
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

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating a CatalogueItem with an empty shopId override is denied", async () => {
  await seedHousehold(testEnv, alice);

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

  await assertFixture(fixture, testEnv);
});

test("isMember() gate: a signed-in non-member creating a CatalogueItem is denied", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(uid("mallory"));
  await assertFails(
    context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
    }),
  );
});
