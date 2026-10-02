import { test } from "node:test";
import { serverTimestamp } from "firebase/firestore";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { TAG_NAMES_COLLECTION, TAGS_COLLECTION, tagId, tagNameKey } from "../../src/catalogue/tag.ts";
import { uid } from "../../src/core/uid.ts";
import { assertBatchFixture, type RulesBatchFixture } from "./fixture.ts";
import { seedHousehold, seedTag } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const mallory = uid("mallory");

const rulesTestEnv = setupRulesTestEnv();

/** A Tag and the claim on its name, as one batch fixture. */
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

test("create: a Member creating a Tag batched with its name's claim is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await assertBatchFixture(createTagFixture("new Tag", "Vegan", "vegan", "accept"), rulesTestEnv.env);
});

test("create: a Tag with no claim on its name is denied", async () => {
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

test("create: a name with a slash claims an escaped key and is accepted", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await assertBatchFixture(
    createTagFixture("slash name", "Fruit/Veg", "fruitVeg", "accept"),
    rulesTestEnv.env,
  );
});

test("create: a claim naming a Tag whose name has another key is denied", async () => {
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
