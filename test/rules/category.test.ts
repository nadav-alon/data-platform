import { test } from "node:test";
import assert from "node:assert/strict";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { serverTimestamp } from "firebase/firestore";
import { CATEGORIES_COLLECTION, categoryId } from "../../src/catalogue/category.ts";
import { SHOPS_COLLECTION, shopId } from "../../src/catalogue/shop.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedCategory, seedHousehold, seedMember, seedShop } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const bob = uid("bob");

const rulesTestEnv = setupRulesTestEnv();

test("reference count: creating a Category batched with its default Shop's referenceCount bump is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), {
    name: "Medicine",
    defaultShopId: "pharmacy",
    referenceCount: 0,
  });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
});

test("reference count: creating a Category without also bumping its default Shop's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${CATEGORIES_COLLECTION}/medicine`).set({
      name: "Medicine",
      defaultShopId: "pharmacy",
      referenceCount: 0,
    }),
  );
});

test("reference count: creating a Category with the wrong Shop referenceCount delta is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), {
    name: "Medicine",
    defaultShopId: "pharmacy",
    referenceCount: 0,
  });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 2 });
  await assertFails(batch.commit());
});

test("reference count: creating a Category whose default Shop doesn't exist is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${CATEGORIES_COLLECTION}/medicine`).set({
      name: "Medicine",
      defaultShopId: "pharmacy",
      referenceCount: 0,
    }),
  );
});

test("reference count: updating a Category without changing its default Shop needs no Shop batch write", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 1);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0);

  const fixture: RulesFixture = {
    name: "Category rename, same defaultShopId",
    collection: CATEGORIES_COLLECTION,
    doc: { id: "medicine", data: { name: "Medication", defaultShopId: "pharmacy", referenceCount: 0 } },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("reference count: moving a Category to a new default Shop without adjusting either Shop's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 1);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${CATEGORIES_COLLECTION}/medicine`).set({
      name: "Medicine",
      defaultShopId: "grocery",
      referenceCount: 0,
    }),
  );
});

test("reference count: moving a Category to a new default Shop batched with both Shops' referenceCount adjustments is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 1);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), {
    name: "Medicine",
    defaultShopId: "grocery",
    referenceCount: 0,
  });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 0 });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
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

test("soft delete: an unreferenced Category soft-deleted batched with its default Shop's referenceCount drop is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 1);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0);

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), { deletedAt: serverTimestamp() });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 0 });
  await assertSucceeds(batch.commit());
});

test("soft delete: soft-deleting a Category without dropping its default Shop's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 1);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0);

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(
    firestore.doc(`${CATEGORIES_COLLECTION}/medicine`).update({ deletedAt: serverTimestamp() }),
  );
});

test("soft delete: a Category with a nonzero referenceCount cannot be soft-deleted, even with the Shop drop batched", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 1);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 1);

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), { deletedAt: serverTimestamp() });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 0 });
  await assertFails(batch.commit());
});

test("soft delete: zeroing a Category's referenceCount in the same write does not let it be soft-deleted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 1);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 1);

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), {
    deletedAt: serverTimestamp(),
    referenceCount: 0,
  });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 0 });
  await assertFails(batch.commit());
});

test("soft delete: restoring a Category batched with its default Shop's referenceCount bump is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0, { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), {
    name: "Category",
    defaultShopId: "pharmacy",
    referenceCount: 0,
  });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
});

test("soft delete: restoring a Category without bumping its default Shop's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0, { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(
    firestore.doc(`${CATEGORIES_COLLECTION}/medicine`).set({
      name: "Category",
      defaultShopId: "pharmacy",
      referenceCount: 0,
    }),
  );
});

test("soft delete: renaming a soft-deleted Category needs no Shop batch write", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0, { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertSucceeds(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`).update({ name: "Medication" }));
});

test("no references to deleted: creating a Category whose default Shop is soft-deleted is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0, { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), {
    name: "Medicine",
    defaultShopId: "pharmacy",
    referenceCount: 0,
  });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 1 });
  await assertFails(batch.commit());
});

test("no references to deleted: moving a Category's default Shop to a soft-deleted Shop is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 1);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0, { deleted: true });
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0);

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), {
    name: "Medicine",
    defaultShopId: "grocery",
    referenceCount: 0,
  });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 0 });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 1 });
  await assertFails(batch.commit());
});

test("no references to deleted: restoring a Category whose default Shop is still soft-deleted is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0, { deleted: true });
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0, { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), {
    name: "Category",
    defaultShopId: "pharmacy",
    referenceCount: 0,
  });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 1 });
  await assertFails(batch.commit());
});

test("no references to deleted: restoring a Category while moving it to a live default Shop in the same write is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0, { deleted: true });
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0, { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), {
    name: "Category",
    defaultShopId: "grocery",
    referenceCount: 0,
  });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
});

test("hard delete: the Owner cannot delete an unreferenced Category, even batched with its Shop's count drop", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 1);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0);

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`).delete());
  const batch = firestore.batch();
  batch.delete(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`));
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 0 });
  await assertFails(batch.commit());
});

test("hard delete: the Owner cannot delete a soft-deleted Category", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0, { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`).delete());
});

test("hard delete: a non-Owner Member cannot delete a Category", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 1);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0);

  const firestore = rulesTestEnv.env.authenticatedContext(bob).firestore();
  await assertFails(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`).delete());
});

test("reference count: a restore batch against a Category that is still live is denied, leaving its default Shop's referenceCount unchanged", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 1);
  await seedCategory(rulesTestEnv.env, categoryId("medicine"), shopId("pharmacy"), 0);

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const deleteBatch = firestore.batch();
  deleteBatch.update(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), { deletedAt: serverTimestamp() });
  await assertFails(deleteBatch.commit());

  const restoreBatch = firestore.batch();
  restoreBatch.set(firestore.doc(`${CATEGORIES_COLLECTION}/medicine`), {
    name: "Category",
    defaultShopId: "pharmacy",
    referenceCount: 0,
  });
  restoreBatch.update(firestore.doc(`${SHOPS_COLLECTION}/pharmacy`), { referenceCount: 2 });
  await assertFails(restoreBatch.commit());

  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    const shop = await context.firestore().doc(`${SHOPS_COLLECTION}/pharmacy`).get();
    assert.equal(shop.data()?.referenceCount, 1);
  });
});
