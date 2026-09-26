import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { HOUSEHOLD_DOC_PATH, householdMetaSchema } from "../../src/core/household.ts";
import { MEMBERS_COLLECTION, memberDocPath, memberSchema } from "../../src/core/members.ts";
import { uid, type Uid } from "../../src/core/uid.ts";
import {
  assertBatchFixture,
  assertFixture,
  type RulesBatchFixture,
  type RulesFixture,
} from "./fixture.ts";

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

/** Seeds `members/{uid}` directly, bypassing rules, so a test can assume a Member exists. */
async function seedMember(memberUid: Uid): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(memberDocPath(memberUid)).set(validMemberData);
  });
}

/** Seeds a claimed Household directly, bypassing rules, so a test can start post-bootstrap. */
async function seedHousehold(owner: Uid): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(HOUSEHOLD_DOC_PATH).set({ owner });
  });
  await seedMember(owner);
}

test("isMember() gate: an unauthenticated read of meta/household is denied", async () => {
  const context = testEnv.unauthenticatedContext();
  await assertFails(context.firestore().doc(HOUSEHOLD_DOC_PATH).get());
});

test("isMember() gate: a signed-in non-member's read of meta/household is denied", async () => {
  const context = testEnv.authenticatedContext(mallory);
  await assertFails(context.firestore().doc(HOUSEHOLD_DOC_PATH).get());
});

test("isMember() gate: a Member's read of meta/household is allowed", async () => {
  await seedMember(alice);
  const context = testEnv.authenticatedContext(alice);
  await assertSucceeds(context.firestore().doc(HOUSEHOLD_DOC_PATH).get());
});

test("isMember() gate: a signed-in non-member's read of meta/platform is denied", async () => {
  const context = testEnv.authenticatedContext(mallory);
  await assertFails(context.firestore().doc("meta/platform").get());
});

test("isMember() gate: a Member's read of meta/platform is allowed", async () => {
  await seedMember(alice);
  const context = testEnv.authenticatedContext(alice);
  await assertSucceeds(context.firestore().doc("meta/platform").get());
});

test("isMember() gate: a signed-in non-member's read of another uid's members doc is denied", async () => {
  await seedMember(alice);
  const context = testEnv.authenticatedContext(mallory);
  await assertFails(context.firestore().doc(memberDocPath(alice)).get());
});

test("isMember() gate: a Member's read of another Member's doc is allowed", async () => {
  await seedMember(alice);
  await seedMember(bob);
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
        schema: householdMetaSchema,
        data: { owner: alice },
      },
      {
        collection: MEMBERS_COLLECTION,
        id: alice,
        schema: memberSchema,
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
  await seedHousehold(alice);

  const context = testEnv.authenticatedContext(mallory);
  const batch = context.firestore().batch();
  batch.set(context.firestore().doc(HOUSEHOLD_DOC_PATH), { owner: mallory });
  batch.set(context.firestore().doc(memberDocPath(mallory)), validMemberData);
  await assertFails(batch.commit());
});

test("isMember() gate: once the household is claimed, a signed-in non-member can't self-enrol as a member", async () => {
  await seedHousehold(alice);

  const context = testEnv.authenticatedContext(mallory);
  await assertFails(
    context.firestore().doc(memberDocPath(mallory)).set(validMemberData),
  );
});

test("isMember() gate: once the household is claimed, a signed-in non-member can't create another member's doc", async () => {
  await seedHousehold(alice);

  const context = testEnv.authenticatedContext(mallory);
  await assertFails(
    context.firestore().doc(memberDocPath(bob)).set(validMemberData),
  );
});

test("isMember() gate: once the household is claimed, a signed-in non-member's write of meta/platform is denied", async () => {
  await seedHousehold(alice);

  const context = testEnv.authenticatedContext(mallory);
  await assertFails(
    context.firestore().doc("meta/platform").set({ version: "1.0.0" }),
  );
});

test("owner-only members: the owner adding another member's doc is accepted", async () => {
  await seedHousehold(alice);

  const fixture: RulesFixture = {
    name: "alice adds bob as a Member",
    collection: MEMBERS_COLLECTION,
    schema: memberSchema,
    doc: { id: bob, data: validMemberData },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, testEnv);
});

test("owner-only members: a non-owner Member creating another member's doc is denied", async () => {
  await seedHousehold(alice);
  await seedMember(bob);

  const context = testEnv.authenticatedContext(bob);
  await assertFails(
    context.firestore().doc(memberDocPath(carol)).set(validMemberData),
  );
});

test("owner-only members: the owner updating a member's doc is accepted", async () => {
  await seedHousehold(alice);
  await seedMember(bob);

  const fixture: RulesFixture = {
    name: "alice updates bob's member doc",
    collection: MEMBERS_COLLECTION,
    schema: memberSchema,
    doc: { id: bob, data: { ...validMemberData, email: "new@example.com" } },
    auth: { uid: alice },
    expected: "accept",
  };

  await assertFixture(fixture, testEnv);
});

test("owner-only members: a non-owner Member updating a member's doc is denied", async () => {
  await seedHousehold(alice);
  await seedMember(bob);

  const context = testEnv.authenticatedContext(bob);
  await assertFails(
    context.firestore().doc(memberDocPath(alice)).set({ ...validMemberData, email: "new@example.com" }),
  );
});

test("owner-only members: the owner deleting a member's doc is accepted", async () => {
  await seedHousehold(alice);
  await seedMember(bob);

  const context = testEnv.authenticatedContext(alice);
  await assertSucceeds(context.firestore().doc(memberDocPath(bob)).delete());
});

test("owner-only members: a non-owner Member deleting a member's doc is denied", async () => {
  await seedHousehold(alice);
  await seedMember(bob);

  const context = testEnv.authenticatedContext(bob);
  await assertFails(context.firestore().doc(memberDocPath(alice)).delete());
});
