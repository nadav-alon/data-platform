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
 * rules aren't live: a read checks the credential before anything deploys, the rules deploy runs
 * next, and `meta/platform` is written last, only once those rules are actually live.
 */
const app = initializeApp({ credential: applicationDefault(), projectId });
const platformDoc = getFirestore(app).doc(PLATFORM_DOC_PATH);
const platformMeta: PlatformMeta = { version: PLATFORM_VERSION };

await runDeploy({
  checkCredential: () => platformDoc.get(),
  deployRules: () =>
    execFileSync("npx", ["firebase", "deploy", "--only", "firestore:rules", "--project", projectId], {
      stdio: "inherit",
    }),
  writeMeta: () => platformDoc.set(platformMeta),
});
