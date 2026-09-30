import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { serverTimestamp } from "firebase/firestore";
import { SHOPS_COLLECTION, shopId } from "../../src/catalogue/shop.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seededDeletedAt, seedHousehold, seedShop } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");

const rulesTestEnv = setupRulesTestEnv();

test("collection validation: a Member creating a Shop with a name and referenceCount 0 is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Shop with a name",
    collection: SHOPS_COLLECTION,
    doc: { id: "pharmacy", data: { name: "Pharmacy", referenceCount: 0 } },
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
    doc: { id: "pharmacy", data: { referenceCount: 0 } },
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
    doc: { id: "pharmacy", data: { name: 123, referenceCount: 0 } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member updating an existing Shop with a non-string name is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`${SHOPS_COLLECTION}/pharmacy`)
      .set({ name: "Pharmacy", referenceCount: 0 });
  });

  const fixture: RulesFixture = {
    name: "Shop update with a non-string name",
    collection: SHOPS_COLLECTION,
    doc: { id: "pharmacy", data: { name: 123, referenceCount: 0 } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating a Shop missing its referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Shop missing its referenceCount",
    collection: SHOPS_COLLECTION,
    doc: { id: "pharmacy", data: { name: "Pharmacy" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("collection validation: a Member creating a Shop with a negative referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "Shop with a negative referenceCount",
    collection: SHOPS_COLLECTION,
    doc: { id: "pharmacy", data: { name: "Pharmacy", referenceCount: -1 } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("new-doc invariant: a Member creating a Shop with a nonzero referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${SHOPS_COLLECTION}/pharmacy`).set({ name: "Pharmacy", referenceCount: 1 }),
  );
});

test("in-use guard: deleting an unreferenced Shop is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`${SHOPS_COLLECTION}/pharmacy`)
      .set({ name: "Pharmacy", referenceCount: 0 });
  });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertSucceeds(context.firestore().doc(`${SHOPS_COLLECTION}/pharmacy`).delete());
});

test("in-use guard: deleting a Shop whose referenceCount is nonzero is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`${SHOPS_COLLECTION}/pharmacy`)
      .set({ name: "Pharmacy", referenceCount: 1 });
  });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(context.firestore().doc(`${SHOPS_COLLECTION}/pharmacy`).delete());
});

test("isMember() gate: a signed-in non-member creating a Shop is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(uid("mallory"));
  await assertFails(
    context.firestore().doc(`${SHOPS_COLLECTION}/pharmacy`).set({ name: "Pharmacy" }),
  );
});

test("soft delete: a Member setting a Shop's deletedAt to a client-chosen time is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${SHOPS_COLLECTION}/pharmacy`).update({ deletedAt: new Date(0) }),
  );
});

test("soft delete: a Member creating a Shop that is already soft-deleted is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context
      .firestore()
      .doc(`${SHOPS_COLLECTION}/pharmacy`)
      .set({ name: "Pharmacy", referenceCount: 0, deletedAt: serverTimestamp() }),
  );
});

test("soft delete: a Shop with referenceCount 0 can be soft-deleted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertSucceeds(
    context.firestore().doc(`${SHOPS_COLLECTION}/pharmacy`).update({ deletedAt: serverTimestamp() }),
  );
});

test("soft delete: a Shop with a nonzero referenceCount cannot be soft-deleted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 1);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${SHOPS_COLLECTION}/pharmacy`).update({ deletedAt: serverTimestamp() }),
  );
});

test("soft delete: zeroing a Shop's referenceCount in the same write does not let it be soft-deleted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 1);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context
      .firestore()
      .doc(`${SHOPS_COLLECTION}/pharmacy`)
      .update({ deletedAt: serverTimestamp(), referenceCount: 0 }),
  );
});

test("soft delete: a soft-deleted Shop can be restored", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`${SHOPS_COLLECTION}/pharmacy`)
      .set({ name: "Pharmacy", referenceCount: 0, deletedAt: seededDeletedAt });
  });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertSucceeds(
    context.firestore().doc(`${SHOPS_COLLECTION}/pharmacy`).set({ name: "Pharmacy", referenceCount: 0 }),
  );
});

test("soft delete: restoring a Shop by writing deletedAt: null is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0, { deleted: true });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(context.firestore().doc(`${SHOPS_COLLECTION}/pharmacy`).update({ deletedAt: null }));
});

test("soft delete: creating a Shop with deletedAt: null is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context
      .firestore()
      .doc(`${SHOPS_COLLECTION}/pharmacy`)
      .set({ name: "Pharmacy", referenceCount: 0, deletedAt: null }),
  );
});
