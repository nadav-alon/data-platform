import { test } from "node:test";
import { assertFails } from "@firebase/rules-unit-testing";
import { SHOPS_COLLECTION } from "../../src/catalogue/shop.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");

const rulesTestEnv = setupRulesTestEnv();

test("collection validation: a Member creating a Shop with a name is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Shop with a name",
    collection: SHOPS_COLLECTION,
    doc: { id: "pharmacy", data: { name: "Pharmacy" } },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating a Shop missing its name is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Shop missing its name",
    collection: SHOPS_COLLECTION,
    doc: { id: "pharmacy", data: {} },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating a Shop with a non-string name is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Shop with a non-string name",
    collection: SHOPS_COLLECTION,
    doc: { id: "pharmacy", data: { name: 123 } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member updating an existing Shop with a non-string name is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${SHOPS_COLLECTION}/pharmacy`).set({ name: "Pharmacy" });
  });

  const fixture: RulesFixture = {
    name: "Shop update with a non-string name",
    collection: SHOPS_COLLECTION,
    doc: { id: "pharmacy", data: { name: 123 } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("isMember() gate: a signed-in non-member creating a Shop is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(uid("mallory"));
  await assertFails(
    context.firestore().doc(`${SHOPS_COLLECTION}/pharmacy`).set({ name: "Pharmacy" }),
  );
});
