import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { CATEGORIES_COLLECTION, categorySchema } from "../../src/catalogue/category.ts";
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

test("collection validation: a Member creating a Category with a name and default Shop is accepted", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "Category with name and defaultShopId",
    collection: CATEGORIES_COLLECTION,
    schema: categorySchema,
    doc: { id: "medicine", data: { name: "Medicine", defaultShopId: "pharmacy" } },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating a Category with a non-string name is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "Category with a non-string name",
    collection: CATEGORIES_COLLECTION,
    schema: categorySchema,
    doc: { id: "medicine", data: { name: 42, defaultShopId: "pharmacy" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating a Category missing its defaultShopId is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "Category missing its defaultShopId",
    collection: CATEGORIES_COLLECTION,
    schema: categorySchema,
    doc: { id: "medicine", data: { name: "Medicine" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member updating an existing Category to remove its defaultShopId is denied", async () => {
  await seedHousehold(testEnv, alice);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${CATEGORIES_COLLECTION}/medicine`).set({
      name: "Medicine",
      defaultShopId: "pharmacy",
    });
  });

  const fixture: RulesFixture = {
    name: "Category update missing its defaultShopId",
    collection: CATEGORIES_COLLECTION,
    schema: categorySchema,
    doc: { id: "medicine", data: { name: "Medicine" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating a Category with an empty name is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "Category with an empty name",
    collection: CATEGORIES_COLLECTION,
    schema: categorySchema,
    doc: { id: "medicine", data: { name: "", defaultShopId: "pharmacy" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("isMember() gate: a signed-in non-member creating a Category is denied", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(uid("mallory"));
  await assertFails(
    context.firestore().doc(`${CATEGORIES_COLLECTION}/medicine`).set({
      name: "Medicine",
      defaultShopId: "pharmacy",
    }),
  );
});
