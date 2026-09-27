import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { HOUSEHOLD_DOC_PATH } from "../../src/core/household.ts";
import { memberDocPath } from "../../src/core/members.ts";
import type { Uid } from "../../src/core/uid.ts";

const validMemberData = {
  email: "member@example.com",
  addedAt: { seconds: 1_700_000_000, nanoseconds: 0 },
};

/** Seeds `members/{uid}` directly, bypassing rules, so a test can assume a Member exists. */
export async function seedMember(testEnv: RulesTestEnvironment, memberUid: Uid): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(memberDocPath(memberUid)).set(validMemberData);
  });
}

/** Seeds a claimed Household directly, bypassing rules, so a test can start post-bootstrap. */
export async function seedHousehold(testEnv: RulesTestEnvironment, owner: Uid): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(HOUSEHOLD_DOC_PATH).set({ owner });
  });
  await seedMember(testEnv, owner);
}
