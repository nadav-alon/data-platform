import { test } from "node:test";
import { assertFails } from "@firebase/rules-unit-testing";
import { ITEMS_COLLECTION, itemSchema } from "../../src/core/item.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");

const rulesTestEnv = setupRulesTestEnv();

test("collection validation: a Member creating an Item with only the required fields is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Item with only name and state",
    collection: ITEMS_COLLECTION,
    schema: itemSchema,
    doc: { id: "dish-soap", data: { name: "Dish soap", state: "enough" } },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating an Item with its optional fields set is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

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

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating an Item with an unknown field is accepted (additive evolution)", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

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

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating an Item with a non-string name is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Item with a non-string name",
    collection: ITEMS_COLLECTION,
    schema: itemSchema,
    doc: { id: "dish-soap", data: { name: 42, state: "enough" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating an Item missing its name is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Item missing its name",
    collection: ITEMS_COLLECTION,
    schema: itemSchema,
    doc: { id: "dish-soap", data: { state: "enough" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating an Item with a state outside the enum is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Item with a state outside the State enum",
    collection: ITEMS_COLLECTION,
    schema: itemSchema,
    doc: { id: "dish-soap", data: { name: "Dish soap", state: "almost gone" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member updating an existing Item into a state outside the enum is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
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

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating an Item with a non-string barcode is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Item with a non-string barcode",
    collection: ITEMS_COLLECTION,
    schema: itemSchema,
    doc: { id: "dish-soap", data: { name: "Dish soap", state: "enough", barcodes: [1] } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating an Item with a barcode that isn't a GTIN is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Item with a barcode that isn't a GTIN",
    collection: ITEMS_COLLECTION,
    schema: itemSchema,
    doc: { id: "dish-soap", data: { name: "Dish soap", state: "enough", barcodes: ["dish soap"] } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("isMember() gate: a signed-in non-member creating an Item is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(uid("mallory"));
  await assertFails(
    context.firestore().doc(`${ITEMS_COLLECTION}/dish-soap`).set({
      name: "Dish soap",
      state: "enough",
    }),
  );
});
