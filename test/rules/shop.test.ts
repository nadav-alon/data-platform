import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { SHOPS_COLLECTION, shopSchema } from "../../src/catalogue/shop.ts";
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

test("collection validation: a Member creating a Shop with a name is accepted", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "Shop with a name",
    collection: SHOPS_COLLECTION,
    schema: shopSchema,
    doc: { id: "pharmacy", data: { name: "Pharmacy" } },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating a Shop missing its name is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "Shop missing its name",
    collection: SHOPS_COLLECTION,
    schema: shopSchema,
    doc: { id: "pharmacy", data: {} },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("collection validation: a Member creating a Shop with a non-string name is denied", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "Shop with a non-string name",
    collection: SHOPS_COLLECTION,
    schema: shopSchema,
    doc: { id: "pharmacy", data: { name: 123 } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("isMember() gate: a signed-in non-member creating a Shop is denied", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(uid("mallory"));
  await assertFails(
    context.firestore().doc(`${SHOPS_COLLECTION}/pharmacy`).set({ name: "Pharmacy" }),
  );
});
