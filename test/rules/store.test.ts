import { test } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteField, serverTimestamp } from "firebase/firestore";
import { shopId } from "../../src/catalogue/shop.ts";
import { STORES_COLLECTION, storeId } from "../../src/catalogue/store.ts";
import { uid } from "../../src/core/uid.ts";
import { assertFixture, type RulesFixture } from "./fixture.ts";
import { seedHousehold, seedShop, seedStore } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const mallory = uid("mallory");

const rulesTestEnv = setupRulesTestEnv();

function createStoreFixture(
  name: string,
  data: Record<string, unknown>,
  expected: "accept" | "reject",
): RulesFixture {
  return {
    name,
    collection: STORES_COLLECTION,
    doc: { id: "osherAd", data },
    auth: { uid: alice },
    expected,
  };
}

async function seedGrocery(): Promise<void> {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0);
}

test("create: a Member creating a Store under a live Shop is accepted", async () => {
  await seedGrocery();
  await assertFixture(
    createStoreFixture("Store with no order", { name: "Osher Ad", shopId: "grocery" }, "accept"),
    rulesTestEnv.env,
  );
});

test("create: a Store with an aisleOrder is accepted, and doesn't change its Shop's referenceCount", async () => {
  await seedGrocery();
  await assertFixture(
    createStoreFixture(
      "Store with an order",
      { name: "Osher Ad", shopId: "grocery", aisleOrder: ["produce", "dairy", "frozen"] },
      "accept",
    ),
    rulesTestEnv.env,
  );
});

test("create: a Store naming no Shop is denied", async () => {
  await seedGrocery();
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(
    firestore.doc(`${STORES_COLLECTION}/osherAd`).set({ name: "Osher Ad", shopId: "pharmacy" }),
  );
});

test("create: a Store naming a soft-deleted Shop is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0, { deleted: true });
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(
    firestore.doc(`${STORES_COLLECTION}/osherAd`).set({ name: "Osher Ad", shopId: "grocery" }),
  );
});

test("create: an aisleOrder with a repeated id is denied", async () => {
  await seedGrocery();
  await assertFixture(
    createStoreFixture(
      "repeated Aisle",
      { name: "Osher Ad", shopId: "grocery", aisleOrder: ["dairy", "frozen", "dairy"] },
      "reject",
    ),
    rulesTestEnv.env,
  );
});

test("create: an aisleOrder that is not a list of ids is denied", async () => {
  await seedGrocery();
  for (const aisleOrder of ["dairy", [7], [""]]) {
    await assertFixture(
      createStoreFixture("bad order", { name: "Osher Ad", shopId: "grocery", aisleOrder }, "reject"),
      rulesTestEnv.env,
    );
  }
});

test("create: a blank, missing or non-string name is denied", async () => {
  await seedGrocery();
  for (const data of [{ name: "  " }, {}, { name: 7 }]) {
    await assertFixture(
      createStoreFixture("bad name", { shopId: "grocery", ...data }, "reject"),
      rulesTestEnv.env,
    );
  }
});

test("create: two Stores may share a name", async () => {
  await seedGrocery();
  await seedStore(rulesTestEnv.env, storeId("other"), shopId("grocery"));
  await assertFixture(
    createStoreFixture("same name", { name: "Osher Ad", shopId: "grocery" }, "accept"),
    rulesTestEnv.env,
  );
});

test("create: a Store created already soft-deleted is denied", async () => {
  await seedGrocery();
  await assertFixture(
    createStoreFixture(
      "born deleted",
      { name: "Osher Ad", shopId: "grocery", deletedAt: serverTimestamp() },
      "reject",
    ),
    rulesTestEnv.env,
  );
});

test("isMember() gate: a non-member can neither read nor create a Store", async () => {
  await seedGrocery();
  await seedStore(rulesTestEnv.env, storeId("osherAd"), shopId("grocery"));
  const firestore = rulesTestEnv.env.authenticatedContext(mallory).firestore();
  await assertFails(firestore.doc(`${STORES_COLLECTION}/osherAd`).get());
  await assertFails(
    firestore.doc(`${STORES_COLLECTION}/other`).set({ name: "Other", shopId: "grocery" }),
  );
});

test("read: a Member can read a Store and list Stores", async () => {
  await seedGrocery();
  await seedStore(rulesTestEnv.env, storeId("osherAd"), shopId("grocery"));
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertSucceeds(firestore.doc(`${STORES_COLLECTION}/osherAd`).get());
  await assertSucceeds(firestore.collection(STORES_COLLECTION).get());
});

test("reorder: a Member reorders aisleOrder and is accepted", async () => {
  await seedGrocery();
  await seedStore(rulesTestEnv.env, storeId("osherAd"), shopId("grocery"), {
    aisleOrder: [],
  });
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const doc = firestore.doc(`${STORES_COLLECTION}/osherAd`);
  await assertSucceeds(doc.update({ aisleOrder: ["dairy", "frozen", "produce"] }));
  await assertSucceeds(doc.update({ aisleOrder: ["produce", "dairy", "frozen"] }));
});

test("reorder: an aisleOrder with a repeated id is denied", async () => {
  await seedGrocery();
  await seedStore(rulesTestEnv.env, storeId("osherAd"), shopId("grocery"));
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(
    firestore.doc(`${STORES_COLLECTION}/osherAd`).update({ aisleOrder: ["dairy", "dairy"] }),
  );
});

test("rename: a Member renames a Store, to a blank name is denied", async () => {
  await seedGrocery();
  await seedStore(rulesTestEnv.env, storeId("osherAd"), shopId("grocery"));
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const doc = firestore.doc(`${STORES_COLLECTION}/osherAd`);
  await assertFails(doc.update({ name: " " }));
  await assertSucceeds(doc.update({ name: "Osher Ad Ramat Aviv" }));
});

test("move: a Store may move to another live Shop but not to a missing one", async () => {
  await seedGrocery();
  await seedShop(rulesTestEnv.env, shopId("pharmacy"), 0);
  await seedStore(rulesTestEnv.env, storeId("osherAd"), shopId("grocery"));
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const doc = firestore.doc(`${STORES_COLLECTION}/osherAd`);
  await assertFails(doc.update({ shopId: "missing" }));
  await assertSucceeds(doc.update({ shopId: "pharmacy" }));
});

test("update: a non-member can't update a Store", async () => {
  await seedGrocery();
  await seedStore(rulesTestEnv.env, storeId("osherAd"), shopId("grocery"));
  const firestore = rulesTestEnv.env.authenticatedContext(mallory).firestore();
  await assertFails(firestore.doc(`${STORES_COLLECTION}/osherAd`).update({ name: "Mine" }));
});

test("soft delete: a Member soft-deletes a Store and restores it", async () => {
  await seedGrocery();
  await seedStore(rulesTestEnv.env, storeId("osherAd"), shopId("grocery"));
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const doc = firestore.doc(`${STORES_COLLECTION}/osherAd`);
  await assertSucceeds(doc.update({ deletedAt: serverTimestamp() }));
  await assertSucceeds(doc.update({ deletedAt: deleteField() }));
});

test("soft delete: a deletedAt other than the server's time is denied", async () => {
  await seedGrocery();
  await seedStore(rulesTestEnv.env, storeId("osherAd"), shopId("grocery"));
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(
    firestore.doc(`${STORES_COLLECTION}/osherAd`).update({ deletedAt: new Date(0) }),
  );
});

test("soft delete: a Store whose Shop is soft-deleted can be soft-deleted but not restored", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedShop(rulesTestEnv.env, shopId("grocery"), 0, { deleted: true });
  await seedStore(rulesTestEnv.env, storeId("osherAd"), shopId("grocery"));
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const doc = firestore.doc(`${STORES_COLLECTION}/osherAd`);
  await assertSucceeds(doc.update({ deletedAt: serverTimestamp() }));
  await assertFails(doc.update({ deletedAt: deleteField() }));
});

test("a Store can't be hard-deleted", async () => {
  await seedGrocery();
  await seedStore(rulesTestEnv.env, storeId("osherAd"), shopId("grocery"));
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${STORES_COLLECTION}/osherAd`).delete());
});

test("a Shop with Stores under it still has referenceCount 0 and can be soft-deleted", async () => {
  await seedGrocery();
  await seedStore(rulesTestEnv.env, storeId("osherAd"), shopId("grocery"));
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertSucceeds(firestore.doc("shops/grocery").update({ deletedAt: serverTimestamp() }));
});
