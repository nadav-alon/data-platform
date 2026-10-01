import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { serverTimestamp } from "firebase/firestore";
import { ITEMS_COLLECTION, itemId } from "../../src/core/item.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold, seedItem, seedMember } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const bob = uid("bob");

const rulesTestEnv = setupRulesTestEnv();

test("collection validation: a Member creating an Item with only the required fields is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Item with only name and state",
    collection: ITEMS_COLLECTION,
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

test("soft delete: a Member setting an Item's deletedAt to the server's commit time is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"));

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertSucceeds(
    context.firestore().doc(`${ITEMS_COLLECTION}/dish-soap`).update({ deletedAt: serverTimestamp() }),
  );
});

test("soft delete: a Member setting an Item's deletedAt to a client-chosen time is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"));

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${ITEMS_COLLECTION}/dish-soap`).update({ deletedAt: new Date(0) }),
  );
});

test("soft delete: a Member restoring an Item by clearing its deletedAt is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"), { deleted: true });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertSucceeds(
    context.firestore().doc(`${ITEMS_COLLECTION}/dish-soap`).set({ name: "Item", state: "enough" }),
  );
});

test("soft delete: updating a soft-deleted Item while keeping its deletedAt is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"), { deleted: true });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertSucceeds(
    context.firestore().doc(`${ITEMS_COLLECTION}/dish-soap`).update({ name: "Dish soap" }),
  );
});

test("soft delete: a Member creating an Item that is already soft-deleted is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context
      .firestore()
      .doc(`${ITEMS_COLLECTION}/dish-soap`)
      .set({ name: "Dish soap", state: "enough", deletedAt: serverTimestamp() }),
  );
});

test("soft delete: an Item without a deletedAt is updated exactly as before", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"));

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertSucceeds(
    context.firestore().doc(`${ITEMS_COLLECTION}/dish-soap`).update({ state: "out" }),
  );
});

test("soft delete: re-stamping an already soft-deleted Item's deletedAt is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"), { deleted: true });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${ITEMS_COLLECTION}/dish-soap`).update({ deletedAt: serverTimestamp() }),
  );
});

test("hard delete: the Owner cannot delete a live or a soft-deleted Item", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"));
  await seedItem(rulesTestEnv.env, itemId("sponge"), { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${ITEMS_COLLECTION}/dish-soap`).delete());
  await assertFails(firestore.doc(`${ITEMS_COLLECTION}/sponge`).delete());
});

test("hard delete: a non-Owner Member cannot delete an Item", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"));

  const firestore = rulesTestEnv.env.authenticatedContext(bob).firestore();
  await assertFails(firestore.doc(`${ITEMS_COLLECTION}/dish-soap`).delete());
});
