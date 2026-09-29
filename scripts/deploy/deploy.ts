import { execFileSync } from "node:child_process";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  CATALOGUE_ITEMS_COLLECTION,
  CATEGORIES_COLLECTION,
  SHOPS_COLLECTION,
  categoryId,
  computeReferenceCounts,
  shopId,
  type ExistingCatalogue,
} from "../../src/catalogue/index.ts";
import { PLATFORM_DOC_PATH, PLATFORM_VERSION, type PlatformMeta } from "../../src/core/platform.ts";
import { parseProjectId } from "./parse-args.ts";
import { runDeploy } from "./deploy-order.ts";

const projectId = parseProjectId(process.argv.slice(2));

/**
 * Admin SDK credentials bypass Firestore security rules entirely, which is why `meta/platform`'s
 * own rule can stay `allow write: if false` for every client: only a deploy running with a
 * service account (or, locally, `gcloud auth application-default login`) can reach this. The same
 * bypass is why the referenceCount backfill below can read a Household still on pre-0.3.0 data at
 * all — those documents fail `shopSchema`/`categorySchema` and every rule that reads them.
 *
 * Ordered (see `runDeploy`) so a failure never leaves `meta/platform` claiming a version whose
 * rules aren't live.
 */
const credential = applicationDefault();
const app = initializeApp({ credential, projectId });
const db = getFirestore(app);
const platformDoc = db.doc(PLATFORM_DOC_PATH);
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

/**
 * Recomputes every existing Shop and Category's referenceCount from what currently references
 * it, and writes the result back — idempotent, so re-running it (a retried deploy) is safe.
 */
async function backfillReferenceCounts(): Promise<void> {
  const [shopsSnapshot, categoriesSnapshot, catalogueItemsSnapshot] = await Promise.all([
    db.collection(SHOPS_COLLECTION).get(),
    db.collection(CATEGORIES_COLLECTION).get(),
    db.collection(CATALOGUE_ITEMS_COLLECTION).get(),
  ]);

  const existing: ExistingCatalogue = {
    shopIds: shopsSnapshot.docs.map((doc) => shopId(doc.id)),
    categories: new Map(
      categoriesSnapshot.docs.map((doc) => [
        categoryId(doc.id),
        { defaultShopId: shopId(doc.data().defaultShopId) },
      ]),
    ),
    catalogueItems: catalogueItemsSnapshot.docs.map((doc) => ({
      categoryId: categoryId(doc.data().categoryId),
      shopId: doc.data().shopId === undefined ? undefined : shopId(doc.data().shopId),
    })),
  };

  const { shops, categories } = computeReferenceCounts(existing);
  const batch = db.batch();
  for (const [id, referenceCount] of shops) {
    batch.set(db.collection(SHOPS_COLLECTION).doc(id), { referenceCount }, { merge: true });
  }
  for (const [id, referenceCount] of categories) {
    batch.set(db.collection(CATEGORIES_COLLECTION).doc(id), { referenceCount }, { merge: true });
  }
  await batch.commit();
}

await runDeploy({
  checkCredential: checkRulesCredential,
  backfillReferenceCounts,
  deployRules: () => {
    execFileSync("npx", ["firebase", "deploy", "--only", "firestore:rules", "--project", projectId], {
      stdio: "inherit",
    });
  },
  writePlatformMeta: async () => {
    await platformDoc.set(platformMeta);
  },
});
