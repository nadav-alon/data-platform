import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { serverTimestamp } from "firebase/firestore";
import { CATALOGUE_ITEMS_COLLECTION } from "../../src/catalogue/catalogue-item.ts";
import { CATEGORIES_COLLECTION, categoryId } from "../../src/catalogue/category.ts";
import { SHOPS_COLLECTION, shopId } from "../../src/catalogue/shop.ts";
import { ITEMS_COLLECTION, itemId } from "../../src/core/item.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import {
  seedCatalogueItem,
  seedCategory,
  seedHousehold,
  seedItem,
  seedShop,
} from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");

const rulesTestEnv = setupRulesTestEnv();

test("reference count: creating a CatalogueItem batched with its Category's referenceCount bump is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
});

test("reference count: creating two CatalogueItems in the same Category in one batch is denied — one reference change per target per batch (home-catalogue#50)", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
  });
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/sponge`), {
    categoryId: "cleaning",
    necessity: "essential",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 2 });
  await assertFails(batch.commit());
});

test("reference count: creating a CatalogueItem without also bumping its Category's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
    }),
  );
});

test("reference count: creating a CatalogueItem whose Category doesn't exist is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
    }),
  );
});

test("reference count: creating a CatalogueItem with a shopId override batched with both bumps is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
    shopId: "grocery",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 1 });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
});

test("reference count: creating a CatalogueItem with a shopId override without bumping the Shop's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0);

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
    shopId: "grocery",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 1 });
  await assertFails(batch.commit());
});

test("reference count: updating a CatalogueItem without changing its Category or Shop needs no batch write", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
    });
  });

  const fixture: RulesFixture = {
    name: "CatalogueItem necessity change, same categoryId",
    collection: CATALOGUE_ITEMS_COLLECTION,
    doc: { id: "dish-soap", data: { categoryId: "cleaning", necessity: "optional" } },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, rulesTestEnv.env);
});

test("reference count: moving a CatalogueItem to a new Category without adjusting either Category's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedCategory(rulesTestEnv.env, categoryId("kitchen"), shopId("some-shop"), 0);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
    });
  });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "kitchen",
      necessity: "essential",
    }),
  );
});

test("reference count: moving a CatalogueItem to a new Category batched with both Categories' referenceCount adjustments is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedCategory(rulesTestEnv.env, categoryId("kitchen"), shopId("some-shop"), 0);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
    });
  });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "kitchen",
    necessity: "essential",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 0 });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/kitchen`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
});

test("reference count: adding a shopId override to a CatalogueItem without bumping the Shop's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
    });
  });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
      shopId: "grocery",
    }),
  );
});

test("reference count: adding a shopId override batched with the Shop's referenceCount bump is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
    });
  });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
    shopId: "grocery",
  });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
});

test("reference count: removing a CatalogueItem's shopId override batched with the Shop's referenceCount drop is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 1);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
      shopId: "grocery",
    });
  });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  const firestore = context.firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
  });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 0 });
  await assertSucceeds(batch.commit());
});

test("reference count: changing a CatalogueItem's shopId override without adjusting either Shop's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 1);
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0);
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
      shopId: "grocery",
    });
  });

  const context = rulesTestEnv.env.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).set({
      categoryId: "cleaning",
      necessity: "essential",
      shopId: "pharmacy",
    }),
  );
});

test("collection validation: a Member creating a CatalogueItem with a non-string categoryId is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);

  const fixture: RulesFixture = {
    name: "CatalogueItem with a non-string categoryId",
    collection: CATALOGUE_ITEMS_COLLECTION,
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

test("soft delete: an Item and its CatalogueItem soft-deleted in one batch, with the Category's referenceCount dropped, is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"));
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"));

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${ITEMS_COLLECTION}/dish-soap`), { deletedAt: serverTimestamp() });
  batch.update(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), { deletedAt: serverTimestamp() });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 0 });
  await assertSucceeds(batch.commit());
});

test("soft delete: soft-deleting a CatalogueItem with a Shop override drops both counts in the same batch", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 1);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"));
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"), {
    shopId: shopId("grocery"),
  });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${ITEMS_COLLECTION}/dish-soap`), { deletedAt: serverTimestamp() });
  batch.update(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), { deletedAt: serverTimestamp() });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 0 });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 0 });
  await assertSucceeds(batch.commit());
});

test("soft delete: soft-deleting a CatalogueItem without dropping its Shop override's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 1);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"));
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"), {
    shopId: shopId("grocery"),
  });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${ITEMS_COLLECTION}/dish-soap`), { deletedAt: serverTimestamp() });
  batch.update(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), { deletedAt: serverTimestamp() });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 0 });
  await assertFails(batch.commit());
});

test("soft delete: soft-deleting a CatalogueItem without dropping its Category's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"));
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"));

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${ITEMS_COLLECTION}/dish-soap`), { deletedAt: serverTimestamp() });
  batch.update(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), { deletedAt: serverTimestamp() });
  await assertFails(batch.commit());
});

test("soft delete: soft-deleting a CatalogueItem without its Item's doc getting the same deletedAt is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"));
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"));

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), { deletedAt: serverTimestamp() });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 0 });
  await assertFails(batch.commit());
});

test("soft delete: soft-deleting an Item's doc alone, leaving its CatalogueItem live, is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"));
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"));

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${ITEMS_COLLECTION}/dish-soap`).update({ deletedAt: serverTimestamp() }));
});

test("soft delete: restoring an Item and its CatalogueItem in one batch, with the Category's referenceCount raised, is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"), { deleted: true });
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"), { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${ITEMS_COLLECTION}/dish-soap`), { name: "Item", state: "enough" });
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
});

test("soft delete: restoring a CatalogueItem without clearing its Item's deletedAt in the same batch is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"), { deleted: true });
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"), { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 1 });
  await assertFails(batch.commit());
});

test("soft delete: restoring a CatalogueItem without raising its Category's referenceCount is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"), { deleted: true });
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"), { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${ITEMS_COLLECTION}/dish-soap`), { name: "Item", state: "enough" });
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
  });
  await assertFails(batch.commit());
});

test("soft delete: restoring a CatalogueItem with a Shop override raises both counts", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"), { deleted: true });
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"), {
    shopId: shopId("grocery"),
    deleted: true,
  });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${ITEMS_COLLECTION}/dish-soap`), { name: "Item", state: "enough" });
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
    shopId: "grocery",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 1 });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
});

test("soft delete: updating a soft-deleted CatalogueItem's necessity needs no count adjustment", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"), { deleted: true });
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"), { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertSucceeds(
    firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).update({ necessity: "optional" }),
  );
});

test("no references to deleted: creating a CatalogueItem in a soft-deleted Category is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0, { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 1 });
  await assertFails(batch.commit());
});

test("no references to deleted: creating a CatalogueItem with a soft-deleted Shop override is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0, { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
    shopId: "grocery",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 1 });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 1 });
  await assertFails(batch.commit());
});

test("no references to deleted: moving a CatalogueItem to a soft-deleted Category is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedCategory(rulesTestEnv.env, categoryId("kitchen"), shopId("some-shop"), 0, { deleted: true });
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"));

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), { categoryId: "kitchen" });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 0 });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/kitchen`), { referenceCount: 1 });
  await assertFails(batch.commit());
});

test("no references to deleted: restoring a CatalogueItem into its still soft-deleted Category is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0, { deleted: true });
  await seedItem(rulesTestEnv.env, itemId("dish-soap"), { deleted: true });
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"), { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${ITEMS_COLLECTION}/dish-soap`), { name: "Item", state: "enough" });
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 1 });
  await assertFails(batch.commit());
});

test("no references to deleted: moving a CatalogueItem's Shop override to a soft-deleted Shop is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0, { deleted: true });
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"));

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), { shopId: "grocery" });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 1 });
  await assertFails(batch.commit());
});

test("no references to deleted: restoring a CatalogueItem whose Shop override is still soft-deleted is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0, { deleted: true });
  await seedItem(rulesTestEnv.env, itemId("dish-soap"), { deleted: true });
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"), {
    shopId: shopId("grocery"),
    deleted: true,
  });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${ITEMS_COLLECTION}/dish-soap`), { name: "Item", state: "enough" });
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "cleaning",
    necessity: "essential",
    shopId: "grocery",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 1 });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 1 });
  await assertFails(batch.commit());
});

test("no references to deleted: restoring a CatalogueItem while moving it to a live Category and Shop in the same write is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0, { deleted: true });
  await seedCategory(rulesTestEnv.env, categoryId("kitchen"), shopId("some-shop"), 0);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0);
  await seedItem(rulesTestEnv.env, itemId("dish-soap"), { deleted: true });
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"), { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${ITEMS_COLLECTION}/dish-soap`), { name: "Item", state: "enough" });
  batch.set(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`), {
    categoryId: "kitchen",
    necessity: "essential",
    shopId: "grocery",
  });
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/kitchen`), { referenceCount: 1 });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 1 });
  await assertSucceeds(batch.commit());
});

test("hard delete: a Member cannot delete a live CatalogueItem, even batched with its count drops", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 1);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 1);
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"), {
    shopId: shopId("grocery"),
  });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).delete());
  const batch = firestore.batch();
  batch.delete(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`));
  batch.update(firestore.doc(`${CATEGORIES_COLLECTION}/cleaning`), { referenceCount: 0 });
  batch.update(firestore.doc(`${SHOPS_COLLECTION}/grocery`), { referenceCount: 0 });
  await assertFails(batch.commit());
});

test("hard delete: a Member cannot delete a soft-deleted CatalogueItem", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedCategory(rulesTestEnv.env, categoryId("cleaning"), shopId("some-shop"), 0);
  await seedCatalogueItem(rulesTestEnv.env, itemId("dish-soap"), categoryId("cleaning"), { deleted: true });

  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${CATALOGUE_ITEMS_COLLECTION}/dish-soap`).delete());
});
