import { test } from "node:test";
import { deleteField, serverTimestamp } from "firebase/firestore";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { categoryId } from "../../src/catalogue/category.ts";
import { itemId } from "../../src/core/item.ts";
import { TAG_NAMES_COLLECTION, TAGS_COLLECTION, tagId, tagNameKey } from "../../src/catalogue/tag.ts";
import { uid } from "../../src/core/uid.ts";
import { assertBatchFixture, type RulesBatchFixture } from "./fixture.ts";
import { seedCatalogueItem, seedHousehold, seedTag, seededDeletedAt } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const mallory = uid("mallory");

const rulesTestEnv = setupRulesTestEnv();

/** A Tag and the reservation on its name, as one batch fixture. */
function createTagFixture(
  name: string,
  tagName: string,
  id: string,
  expected: "accept" | "reject",
): RulesBatchFixture {
  return {
    name,
    docs: [
      { collection: TAGS_COLLECTION, id, data: { name: tagName } },
      { collection: TAG_NAMES_COLLECTION, id: tagNameKey(tagName), data: { tagId: id } },
    ],
    auth: { uid: alice },
    expected,
  };
}

test("create: a Member creating a Tag batched with its name's reservation is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await assertBatchFixture(createTagFixture("new Tag", "Vegan", "vegan", "accept"), rulesTestEnv.env);
});

test("create: a Tag with no reservation on its name is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${TAGS_COLLECTION}/vegan`).set({ name: "Vegan" }));
});

test("create: a Tag whose name equals a live Tag's name, ignoring case and spaces, is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${TAGS_COLLECTION}/vegan2`), { name: "  vEGAN " });
  batch.set(firestore.doc(`${TAG_NAMES_COLLECTION}/vegan`), { tagId: "vegan2" });
  await assertFails(batch.commit());
});

test("create: a Tag with a different name from every live Tag is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  await assertBatchFixture(
    createTagFixture("distinct name", "Gluten free", "glutenFree", "accept"),
    rulesTestEnv.env,
  );
});

test("create: a blank name is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${TAGS_COLLECTION}/blank`), { name: "   " });
  batch.set(firestore.doc(`${TAG_NAMES_COLLECTION}/blank`), { tagId: "blank" });
  await assertFails(batch.commit());
});

test("create: a name with a slash reserves an escaped key and is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await assertBatchFixture(
    createTagFixture("slash name", "Fruit/Veg", "fruitVeg", "accept"),
    rulesTestEnv.env,
  );
});

test("create: a reservation naming a Tag whose name has another key is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${TAGS_COLLECTION}/vegan`), { name: "Vegan" });
  batch.set(firestore.doc(`${TAG_NAMES_COLLECTION}/vegan`), { tagId: "vegan" });
  batch.set(firestore.doc(`${TAG_NAMES_COLLECTION}/other`), { tagId: "vegan" });
  await assertFails(batch.commit());
});

test("create: a Tag created already soft-deleted is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${TAGS_COLLECTION}/vegan`), { name: "Vegan", deletedAt: serverTimestamp() });
  batch.set(firestore.doc(`${TAG_NAMES_COLLECTION}/vegan`), { tagId: "vegan" });
  await assertFails(batch.commit());
});

test("isMember() gate: a signed-in non-member can neither read nor create a Tag", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  const firestore = rulesTestEnv.env.authenticatedContext(mallory).firestore();
  await assertFails(firestore.doc(`${TAGS_COLLECTION}/vegan`).get());
  await assertFails(firestore.collection(TAGS_COLLECTION).get());
  await assertFails(firestore.doc(`${TAG_NAMES_COLLECTION}/vegan`).get());
  const batch = firestore.batch();
  batch.set(firestore.doc(`${TAGS_COLLECTION}/bulk`), { name: "Bulk" });
  batch.set(firestore.doc(`${TAG_NAMES_COLLECTION}/bulk`), { tagId: "bulk" });
  await assertFails(batch.commit());
});

test("isMember() gate: an unauthenticated caller can neither read nor write a Tag", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  const firestore = rulesTestEnv.env.unauthenticatedContext().firestore();
  await assertFails(firestore.doc(`${TAGS_COLLECTION}/vegan`).get());
  await assertFails(firestore.doc(`${TAGS_COLLECTION}/bulk`).set({ name: "Bulk" }));
});

test("read: a Member can read a Tag and list Tags", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertSucceeds(firestore.doc(`${TAGS_COLLECTION}/vegan`).get());
  await assertSucceeds(firestore.collection(TAGS_COLLECTION).get());
});

test("a Tag can't be hard-deleted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${TAGS_COLLECTION}/vegan`).delete());
});

test("rename: a Member renaming a Tag to a free name, moving the reservation, is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${TAGS_COLLECTION}/vegan`), { name: "Plant based" });
  batch.delete(firestore.doc(`${TAG_NAMES_COLLECTION}/${tagNameKey("Vegan")}`));
  batch.set(firestore.doc(`${TAG_NAMES_COLLECTION}/${tagNameKey("Plant based")}`), { tagId: "vegan" });
  await assertSucceeds(batch.commit());
});

test("rename: changing only the case or spaces of the name keeps the reservation and is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertSucceeds(firestore.doc(`${TAGS_COLLECTION}/vegan`).update({ name: " VEGAN " }));
});

test("rename: a name equal to another live Tag's name, ignoring case and spaces, is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  await seedTag(rulesTestEnv.env, tagId("bulk"), "Bulk");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${TAGS_COLLECTION}/bulk`), { name: " vegan" });
  batch.delete(firestore.doc(`${TAG_NAMES_COLLECTION}/bulk`));
  batch.set(firestore.doc(`${TAG_NAMES_COLLECTION}/vegan`), { tagId: "bulk" });
  await assertFails(batch.commit());
});

test("rename: without moving the reservation is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${TAGS_COLLECTION}/vegan`).update({ name: "Plant based" }));
});

test("rename: a reservation can't be dropped while its Tag still holds the name", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${TAG_NAMES_COLLECTION}/vegan`).delete());
});

test("rename: a non-member is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  const firestore = rulesTestEnv.env.authenticatedContext(mallory).firestore();
  await assertFails(firestore.doc(`${TAGS_COLLECTION}/vegan`).update({ name: " VEGAN " }));
});

test("soft delete: a Member soft-deletes a Tag and releases its name's reservation", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${TAGS_COLLECTION}/vegan`), { deletedAt: serverTimestamp() });
  batch.delete(firestore.doc(`${TAG_NAMES_COLLECTION}/vegan`));
  await assertSucceeds(batch.commit());
});

test("soft delete: a Tag that CatalogueItems still carry can be soft-deleted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  await seedCatalogueItem(rulesTestEnv.env, itemId("oatMilk"), categoryId("dairy"), {
    tagIds: [tagId("vegan")],
  });
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${TAGS_COLLECTION}/vegan`), { deletedAt: serverTimestamp() });
  batch.delete(firestore.doc(`${TAG_NAMES_COLLECTION}/vegan`));
  await assertSucceeds(batch.commit());
});

test("soft delete: leaving the reservation behind is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${TAGS_COLLECTION}/vegan`).update({ deletedAt: serverTimestamp() }));
});

test("soft delete: a deletedAt other than the server's time is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${TAGS_COLLECTION}/vegan`), { deletedAt: seededDeletedAt });
  batch.delete(firestore.doc(`${TAG_NAMES_COLLECTION}/vegan`));
  await assertFails(batch.commit());
});

test("soft delete: frees the name for a new Tag", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan", { deleted: true });
  await assertBatchFixture(createTagFixture("reused name", "vegan", "vegan2", "accept"), rulesTestEnv.env);
});

test("restore: a Member restores a soft-deleted Tag, taking its name's reservation", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan", { deleted: true });
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${TAGS_COLLECTION}/vegan`), { deletedAt: deleteField() });
  batch.set(firestore.doc(`${TAG_NAMES_COLLECTION}/vegan`), { tagId: "vegan" });
  await assertSucceeds(batch.commit());
});

test("restore: a Tag whose name a live Tag has taken meanwhile is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan", { deleted: true });
  await seedTag(rulesTestEnv.env, tagId("vegan2"), "vegan");
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.update(firestore.doc(`${TAGS_COLLECTION}/vegan`), { deletedAt: deleteField() });
  batch.set(firestore.doc(`${TAG_NAMES_COLLECTION}/vegan`), { tagId: "vegan" });
  await assertFails(batch.commit());
});

test("restore: without taking the reservation is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedTag(rulesTestEnv.env, tagId("vegan"), "Vegan", { deleted: true });
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  await assertFails(firestore.doc(`${TAGS_COLLECTION}/vegan`).update({ deletedAt: deleteField() }));
});

for (const [label, name] of [
  ["a tab and newline", "\tVegan\n"],
  ["a carriage return", "\rVegan\r"],
  ["a non-breaking space", "Vegan "],
  ["an ideographic space", "　Vegan　"],
  ["a capital umlaut", "ÄRGER"],
  ["a dotted capital I", "İstanbul"],
  ["a final sigma", "ΟΔΟΣ"],
  ["only a non-breaking space", " "],
] as const) {
  test(`create: the rules and tagNameKey agree on a name with ${label}`, async () => {
    await seedHousehold(rulesTestEnv.env, alice);
    await assertBatchFixture(createTagFixture(label, name, "agree", "accept"), rulesTestEnv.env);
  });
}

test("create: a Tag name of only ASCII whitespace is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const firestore = rulesTestEnv.env.authenticatedContext(alice).firestore();
  const batch = firestore.batch();
  batch.set(firestore.doc(`${TAGS_COLLECTION}/blank`), { name: " \t\n" });
  batch.set(firestore.doc(`${TAG_NAMES_COLLECTION}/blank`), { tagId: "blank" });
  await assertFails(batch.commit());
});
