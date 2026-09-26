import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

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
async function seedMember(uid: string): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`members/${uid}`)
      .set({
        email: "member@example.com",
        addedAt: { seconds: 1_700_000_000, nanoseconds: 0 },
      });
  });
}

test("isMember() gate: an unauthenticated read of meta/household is denied", async () => {
  const context = testEnv.unauthenticatedContext();
  await assertFails(context.firestore().doc("meta/household").get());
});

test("isMember() gate: a signed-in non-member's read of meta/household is denied", async () => {
  const context = testEnv.authenticatedContext("mallory");
  await assertFails(context.firestore().doc("meta/household").get());
});

test("isMember() gate: a Member's read of meta/household is allowed", async () => {
  await seedMember("alice");
  const context = testEnv.authenticatedContext("alice");
  await assertSucceeds(context.firestore().doc("meta/household").get());
});

test("isMember() gate: a signed-in non-member's read of meta/platform is denied", async () => {
  const context = testEnv.authenticatedContext("mallory");
  await assertFails(context.firestore().doc("meta/platform").get());
});

test("isMember() gate: a Member's read of meta/platform is allowed", async () => {
  await seedMember("alice");
  const context = testEnv.authenticatedContext("alice");
  await assertSucceeds(context.firestore().doc("meta/platform").get());
});

test("isMember() gate: a signed-in non-member's read of another uid's members doc is denied", async () => {
  await seedMember("alice");
  const context = testEnv.authenticatedContext("mallory");
  await assertFails(context.firestore().doc("members/alice").get());
});

test("isMember() gate: a Member's read of another Member's doc is allowed", async () => {
  await seedMember("alice");
  await seedMember("bob");
  const context = testEnv.authenticatedContext("bob");
  await assertSucceeds(context.firestore().doc("members/alice").get());
});
