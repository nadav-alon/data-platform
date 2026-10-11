import { test } from "node:test";
import { deleteField, serverTimestamp } from "firebase/firestore";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { categoryId } from "../../src/catalogue/category.ts";
import { itemId } from "../../src/core/item.ts";
import { AISLE_NAMES_COLLECTION, AISLES_COLLECTION, aisleId, aisleNameKey } from "../../src/catalogue/aisle.ts";
import { uid } from "../../src/core/uid.ts";
import { assertBatchFixture, type RulesBatchFixture } from "./fixture.ts";
import { seedCatalogueItem, seedHousehold, seedAisle, seededDeletedAt } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const mallory = uid("mallory");

const rulesTestEnv = setupRulesTestEnv();

/** A Aisle and the reservation on its name, as one batch fixture. */
function createAisleFixture(
  name: string,
  aisleName: string,
  id: string,
  expected: "accept" | "reject",
): RulesBatchFixture {
  return {
    name,
    docs: [
      { collection: AISLES_COLLECTION, id, data: { name: aisleName } },
      { collection: AISLE_NAMES_COLLECTION, id: aisleNameKey(aisleName), data: { aisleId: id } },
    ],
    auth: { uid: alice },
    expected,
  };
}

test("create: a Member creating an Aisle batched with its name's reservation is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await assertBatchFixture(createAisleFixture("new Aisle", "Dairy", "dairy", "accept"), rulesTestEnv.env);
});

test("create: an Aisle with no reservation on its name is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${AISLES_COLLECTION}/dairy`).set({ name: "Dairy" }));
});

test("create: an Aisle whose name equals a live Aisle's name, ignoring case and spaces, is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${AISLES_COLLECTION}/dairy2`), { name: "  vEGAN " });
  batch.set(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`), { aisleId: "dairy2" });
  await assertFails(batch.commit());
});

test("create: an Aisle with a different name from every live Aisle is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  await assertBatchFixture(
    createAisleFixture("distinct name", "Produce", "produce", "accept"),
    rulesTestEnv.env,
  );
});

test("create: a blank name is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${AISLES_COLLECTION}/blank`), { name: "   " });
  batch.set(firestore.doc(`${AISLE_NAMES_COLLECTION}/blank`), { aisleId: "blank" });
  await assertFails(batch.commit());
});

test("create: a name with a slash reserves an escaped key and is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await assertBatchFixture(
    createAisleFixture("slash name", "Fruit/Veg", "fruitVeg", "accept"),
    rulesTestEnv.env,
  );
});

test("create: a reservation naming an Aisle whose name has another key is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${AISLES_COLLECTION}/dairy`), { name: "Dairy" });
  batch.set(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`), { aisleId: "dairy" });
  batch.set(firestore.doc(`${AISLE_NAMES_COLLECTION}/other`), { aisleId: "dairy" });
  await assertFails(batch.commit());
});

test("create: an Aisle created already soft-deleted is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${AISLES_COLLECTION}/dairy`), { name: "Dairy", deletedAt: serverTimestamp() });
  batch.set(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`), { aisleId: "dairy" });
  await assertFails(batch.commit());
});

test("isMember() gate: a signed-in non-member can neither read nor create an Aisle", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  const firestore = rulesTestEnv.env.authenticatedContext(mallory).firestore();
  await assertFails(firestore.doc(`${AISLES_COLLECTION}/dairy`).get());
  await assertFails(firestore.collection(AISLES_COLLECTION).get());
  await assertFails(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`).get());
  const batch = firestore.batch();
  batch.set(firestore.doc(`${AISLES_COLLECTION}/frozen`), { name: "Frozen" });
  batch.set(firestore.doc(`${AISLE_NAMES_COLLECTION}/frozen`), { aisleId: "frozen" });
  await assertFails(batch.commit());
});

test("isMember() gate: an unauthenticated caller can neither read nor write an Aisle", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  const firestore = rulesTestEnv.env.unauthenticatedContext().firestore();
  await assertFails(firestore.doc(`${AISLES_COLLECTION}/dairy`).get());
  await assertFails(firestore.doc(`${AISLES_COLLECTION}/frozen`).set({ name: "Frozen" }));
});

test("read: a Member can read an Aisle and list Aisles", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertSucceeds(firestore.doc(`${AISLES_COLLECTION}/dairy`).get());
  await assertSucceeds(firestore.collection(AISLES_COLLECTION).get());
});

test("an Aisle can't be hard-deleted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${AISLES_COLLECTION}/dairy`).delete());
});

test("rename: a Member renaming an Aisle to a free name, moving the reservation, is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${AISLES_COLLECTION}/dairy`), { name: "Bakery" });
  batch.delete(firestore.doc(`${AISLE_NAMES_COLLECTION}/${aisleNameKey("Dairy")}`));
  batch.set(firestore.doc(`${AISLE_NAMES_COLLECTION}/${aisleNameKey("Bakery")}`), { aisleId: "dairy" });
  await assertSucceeds(batch.commit());
});

test("rename: changing only the case or spaces of the name keeps the reservation and is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertSucceeds(firestore.doc(`${AISLES_COLLECTION}/dairy`).update({ name: " DAIRY " }));
});

test("rename: a name equal to another live Aisle's name, ignoring case and spaces, is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  await seedAisle(rulesTestEnv.env, aisleId("frozen"), "Frozen");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${AISLES_COLLECTION}/frozen`), { name: " dairy" });
  batch.delete(firestore.doc(`${AISLE_NAMES_COLLECTION}/frozen`));
  batch.set(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`), { aisleId: "frozen" });
  await assertFails(batch.commit());
});

test("rename: without moving the reservation is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${AISLES_COLLECTION}/dairy`).update({ name: "Bakery" }));
});

test("rename: a reservation can't be dropped while its Aisle still holds the name", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`).delete());
});

test("rename: a non-member is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  const firestore = rulesTestEnv.env.authenticatedContext(mallory).firestore();
  await assertFails(firestore.doc(`${AISLES_COLLECTION}/dairy`).update({ name: " DAIRY " }));
});

test("soft delete: a Member soft-deletes an Aisle and releases its name's reservation", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${AISLES_COLLECTION}/dairy`), { deletedAt: serverTimestamp() });
  batch.delete(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`));
  await assertSucceeds(batch.commit());
});

test("soft delete: an Aisle that CatalogueItems still sit in can be soft-deleted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  await seedCatalogueItem(rulesTestEnv.env, itemId("oatMilk"), categoryId("dairy"), {
    aisleId: aisleId("dairy"),
  });
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${AISLES_COLLECTION}/dairy`), { deletedAt: serverTimestamp() });
  batch.delete(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`));
  await assertSucceeds(batch.commit());
});

test("soft delete: leaving the reservation behind is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${AISLES_COLLECTION}/dairy`).update({ deletedAt: serverTimestamp() }));
});

test("soft delete: a deletedAt other than the server's time is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${AISLES_COLLECTION}/dairy`), { deletedAt: seededDeletedAt });
  batch.delete(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`));
  await assertFails(batch.commit());
});

test("soft delete: frees the name for a new Aisle", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy", { deleted: true });
  await assertBatchFixture(createAisleFixture("reused name", "dairy", "dairy2", "accept"), rulesTestEnv.env);
});

test("restore: a Member restores a soft-deleted Aisle, taking its name's reservation", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy", { deleted: true });
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${AISLES_COLLECTION}/dairy`), { deletedAt: deleteField() });
  batch.set(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`), { aisleId: "dairy" });
  await assertSucceeds(batch.commit());
});

test("restore: an Aisle whose name a live Aisle has taken meanwhile is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy", { deleted: true });
  await seedAisle(rulesTestEnv.env, aisleId("dairy2"), "dairy");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${AISLES_COLLECTION}/dairy`), { deletedAt: deleteField() });
  batch.set(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`), { aisleId: "dairy" });
  await assertFails(batch.commit());
});

test("restore: without taking the reservation is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy", { deleted: true });
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${AISLES_COLLECTION}/dairy`).update({ deletedAt: deleteField() }));
});

for (const [label, name] of [
  ["a tab and newline", "\tDairy\n"],
  ["a carriage return", "\rDairy\r"],
  ["a non-breaking space", "Dairy "],
  ["an ideographic space", "　Dairy　"],
  ["a capital umlaut", "ÄRGER"],
  ["a dotted capital I", "İstanbul"],
  ["a final sigma", "ΟΔΟΣ"],
  ["only a non-breaking space", " "],
] as const) {
  test(`create: the rules and aisleNameKey agree on a name with ${label}`, async () => {
    await seedHousehold(rulesTestEnv.env, alice);
    await assertBatchFixture(createAisleFixture(label, name, "agree", "accept"), rulesTestEnv.env);
  });
}

test("create: an Aisle name of only ASCII whitespace is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${AISLES_COLLECTION}/blank`), { name: " \t\n" });
  batch.set(firestore.doc(`${AISLE_NAMES_COLLECTION}/blank`), { aisleId: "blank" });
  await assertFails(batch.commit());
});

for (const [label, name, key] of [
  ["a single dot", ".", "."],
  ["two dots", "..", ".."],
  ["a name wrapped in double underscores", "__x__", "__x__"],
  ["a multi-line name wrapped in double underscores", "__a\nb__", "__a\nb__"],
  ["a name over the key length limit", "x".repeat(101), "x".repeat(101)],
] as const) {
  test(`create: an Aisle named with ${label} is denied, as in tagSchema`, async () => {
    await seedHousehold(rulesTestEnv.env, alice);
    await assertBatchFixture(
      {
        name: label,
        docs: [
          { collection: AISLES_COLLECTION, id: "unstorable", data: { name } },
          { collection: AISLE_NAMES_COLLECTION, id: key, data: { aisleId: "unstorable" } },
        ],
        auth: { uid: alice },
        expected: "reject",
      },
      rulesTestEnv.env,
    );
  });
}

for (const [label, name] of [
  ["dots", "..."],
  ["a single underscore on each side", "_x_"],
  ["three underscores", "___"],
  ["a name at the key length limit", "x".repeat(100)],
] as const) {
  test(`create: an Aisle named with ${label} is accepted`, async () => {
    await seedHousehold(rulesTestEnv.env, alice);
    await assertBatchFixture(createAisleFixture(label, name, "edge", "accept"), rulesTestEnv.env);
  });
}

for (const [label, context] of [
  ["a signed-in non-member", () => rulesTestEnv.env.authenticatedContext(mallory)],
  ["an unauthenticated caller", () => rulesTestEnv.env.unauthenticatedContext()],
] as const) {
  test(`isMember() gate: ${label} can't soft-delete an Aisle`, async () => {
    await seedHousehold(rulesTestEnv.env, alice);
    await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
    const firestore = context().firestore();
    const batch = firestore.batch();
    batch.update(firestore.doc(`${AISLES_COLLECTION}/dairy`), { deletedAt: serverTimestamp() });
    batch.delete(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`));
    await assertFails(batch.commit());
  });

  test(`isMember() gate: ${label} can't restore an Aisle`, async () => {
    await seedHousehold(rulesTestEnv.env, alice);
    await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy", { deleted: true });
    const firestore = context().firestore();
    const batch = firestore.batch();
    batch.update(firestore.doc(`${AISLES_COLLECTION}/dairy`), { deletedAt: deleteField() });
    batch.set(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`), { aisleId: "dairy" });
    await assertFails(batch.commit());
  });

  test(`isMember() gate: ${label} can't delete an Aisle's name reservation`, async () => {
    await seedHousehold(rulesTestEnv.env, alice);
    await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
    const firestore = context().firestore();
    await assertFails(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`).delete());
  });

  test(`isMember() gate: ${label} can't create a name reservation on its own`, async () => {
    await seedHousehold(rulesTestEnv.env, alice);
    await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy", { deleted: true });
    const firestore = context().firestore();
    await assertFails(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`).set({ aisleId: "dairy" }));
  });
}

test("release: a Member deletes the reservation of an Aisle the console hard-deleted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${AISLES_COLLECTION}/dairy`).delete();
  });
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertSucceeds(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`).delete());
});

test("release: a non-member can't delete the reservation of a hard-deleted Aisle", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedAisle(rulesTestEnv.env, aisleId("dairy"), "Dairy");
  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`${AISLES_COLLECTION}/dairy`).delete();
  });
  const firestore = rulesTestEnv.env.authenticatedContext(mallory).firestore();
  await assertFails(firestore.doc(`${AISLE_NAMES_COLLECTION}/dairy`).delete());
});
