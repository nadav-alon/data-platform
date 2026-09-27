import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { ITEMS_COLLECTION, itemSchema } from "../../src/core/item.ts";
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

test("collection validation: a Member creating an Item with only the required fields is accepted", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "Item with only name and state",
    collection: ITEMS_COLLECTION,
    schema: itemSchema,
    doc: { id: "dish-soap", data: { name: "Dish soap", state: "enough" } },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating an Item with its optional fields set is accepted", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "Item with brandNote and barcodes set",
    collection: ITEMS_COLLECTION,
    schema: itemSchema,
    doc: {
      id: "dish-soap",
      data: {
        name: "Dish soap",
        brandNote: "the green one",
        barcodes: ["012345678905"],
        state: "running low",
      },
    },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating an Item with an unknown field is accepted (additive evolution)", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "Item with an unexpected extra field",
    collection: ITEMS_COLLECTION,
    schema: itemSchema,
    doc: {
      id: "dish-soap",
      data: { name: "Dish soap", state: "enough", unexpected: true },
    },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating an Item missing its name is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "Item missing its name",
    collection: ITEMS_COLLECTION,
    schema: itemSchema,
    doc: { id: "dish-soap", data: { state: "enough" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating an Item with a state outside the enum is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "Item with a state outside the State enum",
    collection: ITEMS_COLLECTION,
    schema: itemSchema,
    doc: { id: "dish-soap", data: { name: "Dish soap", state: "almost gone" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member updating an existing Item into a state outside the enum is denied", async () => {
  await seedHousehold(testEnv, alice);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${ITEMS_COLLECTION}/dish-soap`).set({
      name: "Dish soap",
      state: "enough",
    });
  });

  const fixture: RulesFixture = {
    name: "Item update with a state outside the State enum",
    collection: ITEMS_COLLECTION,
    schema: itemSchema,
    doc: { id: "dish-soap", data: { name: "Dish soap", state: "almost gone" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating an Item with a non-string barcode is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "Item with a non-string barcode",
    collection: ITEMS_COLLECTION,
    schema: itemSchema,
    doc: { id: "dish-soap", data: { name: "Dish soap", state: "enough", barcodes: [1] } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("isMember() gate: a signed-in non-member creating an Item is denied", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(uid("mallory"));
  await assertFails(
    context.firestore().doc(`${ITEMS_COLLECTION}/dish-soap`).set({
      name: "Dish soap",
      state: "enough",
    }),
  );
});
