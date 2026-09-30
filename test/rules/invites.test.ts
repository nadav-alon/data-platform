import { test } from "node:test";
import assert from "node:assert/strict";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { serverTimestamp } from "firebase/firestore";
import { email } from "../../src/core/email.ts";
import { INVITES_COLLECTION, inviteDocPath } from "../../src/core/invites.ts";
import { memberDocPath } from "../../src/core/members.ts";
import { uid, type Uid } from "../../src/core/uid.ts";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { seedHousehold, seedInvite, seedMember } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const alice = uid("alice");
const bob = uid("bob");
const mallory = uid("mallory");
const guest = email("guest@example.com");

const rulesTestEnv = setupRulesTestEnv();

type TestFirestore = ReturnType<ReturnType<RulesTestEnvironment["authenticatedContext"]>["firestore"]>;

test("owner: the Owner can create an invite", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const db = rulesTestEnv.env.authenticatedContext(alice).firestore();

  await assertSucceeds(db.doc(inviteDocPath(guest)).set({ invitedAt: serverTimestamp() }));
});

test("owner: the Owner can list invites", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedInvite(rulesTestEnv.env, guest);
  const db = rulesTestEnv.env.authenticatedContext(alice).firestore();

  await assertSucceeds(db.collection(INVITES_COLLECTION).get());
});

test("owner: the Owner can delete an invite", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedInvite(rulesTestEnv.env, guest);
  const db = rulesTestEnv.env.authenticatedContext(alice).firestore();

  await assertSucceeds(db.doc(inviteDocPath(guest)).delete());
});

test("owner: a non-Owner Member cannot create, list or delete an invite", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedMember(rulesTestEnv.env, bob);
  await seedInvite(rulesTestEnv.env, guest);
  const db = rulesTestEnv.env.authenticatedContext(bob).firestore();

  await assertFails(
    db.doc(inviteDocPath(email("other@example.com"))).set({ invitedAt: serverTimestamp() }),
  );
  await assertFails(db.collection(INVITES_COLLECTION).get());
  await assertFails(db.doc(inviteDocPath(guest)).delete());
});

test("owner: a non-Member cannot create, list or delete an invite", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedInvite(rulesTestEnv.env, guest);
  const db = rulesTestEnv.env.authenticatedContext(mallory).firestore();

  await assertFails(
    db.doc(inviteDocPath(email("other@example.com"))).set({ invitedAt: serverTimestamp() }),
  );
  await assertFails(db.collection(INVITES_COLLECTION).get());
  await assertFails(db.doc(inviteDocPath(guest)).delete());
});

test("owner: a signed-out caller cannot create, list or delete an invite", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedInvite(rulesTestEnv.env, guest);
  const db = rulesTestEnv.env.unauthenticatedContext().firestore();

  await assertFails(db.doc(inviteDocPath(email("other@example.com"))).set({ invitedAt: serverTimestamp() }));
  await assertFails(db.collection(INVITES_COLLECTION).get());
  await assertFails(db.doc(inviteDocPath(guest)).delete());
});

test("owner: an invite keyed by a non-lowercased email is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const db = rulesTestEnv.env.authenticatedContext(alice).firestore();

  await assertFails(
    db.doc(`${INVITES_COLLECTION}/Guest@Example.com`).set({ invitedAt: serverTimestamp() }),
  );
});

test("owner: an invite whose invitedAt is not the server's commit time is denied", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  const db = rulesTestEnv.env.authenticatedContext(alice).firestore();

  await assertFails(
    db.doc(inviteDocPath(guest)).set({ invitedAt: { seconds: 1_700_000_000, nanoseconds: 0 } }),
  );
});

const guestToken = { email: "Guest@Example.com", email_verified: true };

test("get: a signed-in user can get the invite keyed by their own token email, lowercased", async () => {
  await seedInvite(rulesTestEnv.env, guest);
  const db = rulesTestEnv.env.authenticatedContext(bob, guestToken).firestore();

  await assertSucceeds(db.doc(inviteDocPath(guest)).get());
});

test("get: a signed-in user cannot get another email's invite", async () => {
  await seedInvite(rulesTestEnv.env, email("other@example.com"));
  const db = rulesTestEnv.env.authenticatedContext(bob, guestToken).firestore();

  await assertFails(db.doc(inviteDocPath(email("other@example.com"))).get());
});

test("get: a signed-in user with no token email cannot get an invite", async () => {
  await seedInvite(rulesTestEnv.env, guest);
  const db = rulesTestEnv.env.authenticatedContext(bob).firestore();

  await assertFails(db.doc(inviteDocPath(guest)).get());
});

test("get: a signed-out caller cannot get an invite", async () => {
  await seedInvite(rulesTestEnv.env, guest);
  const db = rulesTestEnv.env.unauthenticatedContext().firestore();

  await assertFails(db.doc(inviteDocPath(guest)).get());
});

/** The invitee's join: their own Member doc created and their invite deleted, in one batch. */
function joinBatch(db: TestFirestore, joiner: Uid) {
  const batch = db.batch();
  batch.set(db.doc(memberDocPath(joiner)), {
    email: guest,
    addedAt: serverTimestamp(),
  });
  batch.delete(db.doc(inviteDocPath(guest)));
  return batch;
}

test("join: an invitee with a verified matching email joins, ending as a Member with the invite gone", async () => {
  await seedHousehold(rulesTestEnv.env, alice);
  await seedInvite(rulesTestEnv.env, guest);
  const db = rulesTestEnv.env.authenticatedContext(bob, guestToken).firestore();

  await assertSucceeds(joinBatch(db, bob).commit());

  await rulesTestEnv.env.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    assert.equal((await firestore.doc(memberDocPath(bob)).get()).exists, true);
    assert.equal((await firestore.doc(inviteDocPath(guest)).get()).exists, false);
  });
});
