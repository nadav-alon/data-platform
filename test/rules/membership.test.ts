import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { Timestamp } from "firebase/firestore";
import { HOUSEHOLD_DOC_PATH } from "../../src/core/household.ts";
import { MEMBERS_COLLECTION, memberDocPath } from "../../src/core/members.ts";
import { uid } from "../../src/core/uid.ts";
import {
  assertBatchFixture,
  assertFixture,
  type RulesBatchFixture,
  type RulesFixture,
} from "./fixture.ts";
import { seedHousehold, seedMember } from "./seed.ts";

const alice = uid("alice");
const bob = uid("bob");
const carol = uid("carol");
const mallory = uid("mallory");

const validMemberData = {
  email: "member@example.com",
  addedAt: { seconds: 1_700_000_000, nanoseconds: 0 },
};

let testEnv: RulesTestEnvironment;

before(async () => {
  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    throw new Error(
      "GCLOUD_PROJECT is not set; run this suite through `npm run test:rules`",
    );
  }

  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

test("isMember() gate: an unauthenticated read of meta/household is denied", async () => {
  const context = testEnv.unauthenticatedContext();
  await assertFails(context.firestore().doc(HOUSEHOLD_DOC_PATH).get());
});

test("isMember() gate: a signed-in non-member's read of meta/household is denied", async () => {
  const context = testEnv.authenticatedContext(mallory);
  await assertFails(context.firestore().doc(HOUSEHOLD_DOC_PATH).get());
});

test("isMember() gate: a Member's read of meta/household is allowed", async () => {
  await seedMember(testEnv, alice);
  const context = testEnv.authenticatedContext(alice);
  await assertSucceeds(context.firestore().doc(HOUSEHOLD_DOC_PATH).get());
});

test("isMember() gate: a signed-in non-member's read of meta/platform is denied", async () => {
  const context = testEnv.authenticatedContext(mallory);
  await assertFails(context.firestore().doc("meta/platform").get());
});

test("isMember() gate: a Member's read of meta/platform is allowed", async () => {
  await seedMember(testEnv, alice);
  const context = testEnv.authenticatedContext(alice);
  await assertSucceeds(context.firestore().doc("meta/platform").get());
});

test("isMember() gate: a signed-in non-member's read of another uid's members doc is denied", async () => {
  await seedMember(testEnv, alice);
  const context = testEnv.authenticatedContext(mallory);
  await assertFails(context.firestore().doc(memberDocPath(alice)).get());
});

test("isMember() gate: a Member's read of another Member's doc is allowed", async () => {
  await seedMember(testEnv, alice);
  await seedMember(testEnv, bob);
  const context = testEnv.authenticatedContext(bob);
  await assertSucceeds(context.firestore().doc(memberDocPath(alice)).get());
});

test("first-claim bootstrap: a batched claim of meta/household and the claimant's own members doc is accepted", async () => {
  const fixture: RulesBatchFixture = {
    name: "alice claims the household and her own membership together",
    docs: [
      {
        collection: "meta",
        id: "household",
        data: { owner: alice },
      },
      {
        collection: MEMBERS_COLLECTION,
        id: alice,
        data: validMemberData,
      },
    ],
    auth: { uid: alice },
    expected: "accept",
  };

  await assertBatchFixture(fixture, testEnv);
});

test("first-claim bootstrap: creating meta/household without the claimant's own members doc in the same batch is denied", async () => {
  const context = testEnv.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(HOUSEHOLD_DOC_PATH).set({ owner: alice }),
  );
});

test("first-claim bootstrap: creating a members doc without meta/household in the same batch is denied", async () => {
  const context = testEnv.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(memberDocPath(alice)).set(validMemberData),
  );
});

test("first-claim bootstrap: once meta/household exists, a second user can't claim it", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(mallory);
  const batch = context.firestore().batch();
  batch.set(context.firestore().doc(HOUSEHOLD_DOC_PATH), { owner: mallory });
  batch.set(context.firestore().doc(memberDocPath(mallory)), validMemberData);
  await assertFails(batch.commit());
});

test("isMember() gate: once the household is claimed, a signed-in non-member can't self-enrol as a member", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(mallory);
  await assertFails(
    context.firestore().doc(memberDocPath(mallory)).set(validMemberData),
  );
});

test("isMember() gate: once the household is claimed, a signed-in non-member can't create another member's doc", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(mallory);
  await assertFails(
    context.firestore().doc(memberDocPath(bob)).set(validMemberData),
  );
});

test("isMember() gate: once the household is claimed, a signed-in non-member's write of meta/platform is denied", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(mallory);
  await assertFails(
    context.firestore().doc("meta/platform").set({ version: "1.0.0" }),
  );
});

test("owner-only members: the owner adding another member's doc is accepted", async () => {
  await seedHousehold(testEnv, alice);

  const fixture: RulesFixture = {
    name: "alice adds bob as a Member",
    collection: MEMBERS_COLLECTION,
    doc: { id: bob, data: validMemberData },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, testEnv);
});

test("owner-only members: a non-owner Member creating another member's doc is denied", async () => {
  await seedHousehold(testEnv, alice);
  await seedMember(testEnv, bob);

  const context = testEnv.authenticatedContext(bob);
  await assertFails(
    context.firestore().doc(memberDocPath(carol)).set(validMemberData),
  );
});

test("owner-only members: the owner updating a member's doc is accepted", async () => {
  await seedHousehold(testEnv, alice);
  await seedMember(testEnv, bob);

  const fixture: RulesFixture = {
    name: "alice updates bob's member doc",
    collection: MEMBERS_COLLECTION,
    doc: { id: bob, data: { ...validMemberData, email: "new@example.com" } },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, testEnv);
});

test("owner-only members: the Owner editing only a Member's email is accepted", async () => {
  await seedHousehold(testEnv, alice);
  await seedMember(testEnv, bob);

  // Not an assertFixture: the fixture always set()s, so a partial update() can't be expressed as one.
  const context = testEnv.authenticatedContext(alice);
  await assertSucceeds(
    context.firestore().doc(memberDocPath(bob)).update({ email: "new@example.com" }),
  );
});

test("owner-only members: the Owner's set() dropping addedAt from a Member's doc is denied", async () => {
  await seedHousehold(testEnv, alice);
  await seedMember(testEnv, bob);

  const fixture: RulesFixture = {
    name: "alice's set() on bob's doc drops addedAt",
    collection: MEMBERS_COLLECTION,
    doc: { id: bob, data: { email: "new@example.com" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("owner-only members: the owner's update() replacing addedAt with a different timestamp is denied", async () => {
  await seedHousehold(testEnv, alice);
  const seededAddedAt = new Timestamp(1_700_000_000, 0);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(memberDocPath(bob)).set({
      email: "member@example.com",
      addedAt: seededAddedAt,
    });
  });

  // Seeded and written as real Firestore Timestamps, not the plain { seconds, nanoseconds }
  // maps used elsewhere: those compare as maps regardless of the rule's Timestamp check, so
  // they can't pin this criterion. The new value is derived from the seeded one so the test
  // reads as "a different timestamp".
  const context = testEnv.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(memberDocPath(bob)).update({
      addedAt: new Timestamp(seededAddedAt.seconds + 1, seededAddedAt.nanoseconds),
    }),
  );
});

test("owner-only members: the owner's update() replacing addedAt with a non-timestamp is denied", async () => {
  await seedHousehold(testEnv, alice);
  await seedMember(testEnv, bob);

  const context = testEnv.authenticatedContext(alice);
  await assertFails(
    context.firestore().doc(memberDocPath(bob)).update({ addedAt: "x" }),
  );
});

test("owner-only members: the owner's set() replacing addedAt with a non-timestamp is denied", async () => {
  await seedHousehold(testEnv, alice);
  await seedMember(testEnv, bob);

  const fixture: RulesFixture = {
    name: "alice's set() on bob's doc replaces addedAt with a non-timestamp",
    collection: MEMBERS_COLLECTION,
    doc: { id: bob, data: { ...validMemberData, addedAt: "x" } },
    auth: { uid: alice },
    expected: "reject",
  };

  await assertFixture(fixture, testEnv);
});

test("owner-only members: a non-owner Member updating a member's doc is denied", async () => {
  await seedHousehold(testEnv, alice);
  await seedMember(testEnv, bob);

  const context = testEnv.authenticatedContext(bob);
  await assertFails(
    context.firestore().doc(memberDocPath(alice)).set({ ...validMemberData, email: "new@example.com" }),
  );
});

test("owner-only members: the owner deleting a member's doc is accepted", async () => {
  await seedHousehold(testEnv, alice);
  await seedMember(testEnv, bob);

  const context = testEnv.authenticatedContext(alice);
  await assertSucceeds(context.firestore().doc(memberDocPath(bob)).delete());
});

test("owner-only members: the owner deleting their own doc is denied", async () => {
  await seedHousehold(testEnv, alice);

  const context = testEnv.authenticatedContext(alice);
  await assertFails(context.firestore().doc(memberDocPath(alice)).delete());
});

test("owner-only members: a non-owner Member deleting the Owner's doc is denied", async () => {
  await seedHousehold(testEnv, alice);
  await seedMember(testEnv, bob);

  const context = testEnv.authenticatedContext(bob);
  await assertFails(context.firestore().doc(memberDocPath(alice)).delete());
});
