import { execFileSync } from "node:child_process";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { PLATFORM_DOC_PATH, PLATFORM_VERSION, type PlatformMeta } from "../../src/core/platform.ts";
import { parseProjectId } from "./parse-args.ts";
import { runDeploy } from "./deploy-order.ts";

const projectId = parseProjectId(process.argv.slice(2));

/**
 * Admin SDK credentials bypass Firestore security rules entirely, which is why `meta/platform`'s
 * own rule can stay `allow write: if false` for every client: only a deploy running with a
 * service account (or, locally, `gcloud auth application-default login`) can reach this.
 *
 * Ordered (see `runDeploy`) so a failure never leaves `meta/platform` claiming a version whose
 * rules aren't live.
 */
const credential = applicationDefault();
const app = initializeApp({ credential, projectId });
const platformDoc = getFirestore(app).doc(PLATFORM_DOC_PATH);
const platformMeta: PlatformMeta = { version: PLATFORM_VERSION };

/**
 * Lists rulesets rather than reading Firestore: listing needs the same Firebase Rules Admin and
 * Service Usage Consumer roles the rules deploy itself needs, so a service account missing either
 * fails here, before the rules deploy runs, instead of only inside it.
 */
async function checkRulesCredential(): Promise<void> {
  const { access_token: accessToken } = await credential.getAccessToken();
  const response = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets?pageSize=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error(`credential check failed: ${response.status} ${await response.text()}`);
  }
}

await runDeploy({
  checkCredential: checkRulesCredential,
  deployRules: () => {
    execFileSync("npx", ["firebase", "deploy", "--only", "firestore:rules", "--project", projectId], {
      stdio: "inherit",
    });
  },
  writeMeta: async () => {
    await platformDoc.set(platformMeta);
  },
});
