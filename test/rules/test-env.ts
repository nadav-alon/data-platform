import { after, before, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";

/** Where a suite reads the emulator it booted in `setupRulesTestEnv()`. */
export interface RulesTestEnvRef {
  readonly env: RulesTestEnvironment;
}

/**
 * Boots the rules emulator once for the calling suite, clearing Firestore between tests and
 * tearing down after. Registers `before`/`beforeEach`/`after` in whatever suite is calling it,
 * the same as if those hooks were written out inline.
 */
export function setupRulesTestEnv(): RulesTestEnvRef {
  const ref = {} as { env: RulesTestEnvironment };

  before(async () => {
    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
      throw new Error(
        "GCLOUD_PROJECT is not set; run this suite through `npm run test:rules`",
      );
    }

    ref.env = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  beforeEach(async () => {
    await ref.env.clearFirestore();
  });

  after(async () => {
    await ref.env.cleanup();
  });

  return ref;
}
