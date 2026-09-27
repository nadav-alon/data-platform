import { execFileSync } from "node:child_process";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { PLATFORM_DOC_PATH, PLATFORM_VERSION, type PlatformMeta } from "../../src/core/platform.ts";
import { parseProjectId } from "./parse-args.ts";

const projectId = parseProjectId(process.argv.slice(2));

execFileSync("npx", ["firebase", "deploy", "--only", "firestore:rules", "--project", projectId], {
  stdio: "inherit",
});

/**
 * Admin credentials bypass Firestore security rules entirely, which is why `meta/platform`'s
 * own rule can stay `allow write: if false` for every client: only a deploy running with a
 * service account (or, locally, `gcloud auth application-default login`) can reach this.
 */
const app = initializeApp({ credential: applicationDefault(), projectId });
const platformMeta: PlatformMeta = { version: PLATFORM_VERSION };
await getFirestore(app).doc(PLATFORM_DOC_PATH).set(platformMeta);
