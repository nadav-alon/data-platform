import { execFileSync } from "node:child_process";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  CATALOGUE_ITEMS_COLLECTION,
  CATEGORIES_COLLECTION,
  SHOPS_COLLECTION,
  computeReferenceCounts,
  parseExistingCatalogue,
  type FirestoreDoc,
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

/** Firestore refuses a batch of more than 500 writes. */
const BATCH_WRITE_LIMIT = 500;

function toFirestoreDocs(docs: readonly FirebaseFirestore.QueryDocumentSnapshot[]): FirestoreDoc[] {
  return docs.map((doc) => ({ id: doc.id, data: doc.data() }));
}

/**
 * Writes `counts` onto `collection`, chunked to Firestore's batch limit, skipping any id that
 * already has a referenceCount: once `firestore.rules` (`getAfter`) owns a document's count, a
 * routine redeploy recomputing it from a snapshot that isn't atomic with live client writes would
 * overwrite an accurate count with a stale one.
 */
async function writeReferenceCounts<Id extends string>(
  collection: string,
  counts: ReadonlyMap<Id, number>,
  alreadyCounted: ReadonlySet<string>,
): Promise<void> {
  const pending = Array.from(counts).filter(([id]) => !alreadyCounted.has(id));
  for (let start = 0; start < pending.length; start += BATCH_WRITE_LIMIT) {
    const batch = db.batch();
    for (const [id, referenceCount] of pending.slice(start, start + BATCH_WRITE_LIMIT)) {
      batch.set(db.collection(collection).doc(id), { referenceCount }, { merge: true });
    }
    await batch.commit();
  }
}

/**
 * Recomputes every existing Shop and Category's referenceCount from what currently references it,
 * and writes it onto whichever of them don't have one yet — idempotent, so re-running it (a
 * retried deploy, or a routine one after 0.3.0's rules are live) is safe. A doc with a malformed
 * `defaultShopId`, `categoryId` or `shopId` is logged and left out rather than aborting the whole
 * backfill.
 */
async function backfillReferenceCounts(): Promise<void> {
  const [shopsSnapshot, categoriesSnapshot, catalogueItemsSnapshot] = await Promise.all([
    db.collection(SHOPS_COLLECTION).get(),
    db.collection(CATEGORIES_COLLECTION).get(),
    db.collection(CATALOGUE_ITEMS_COLLECTION).get(),
  ]);

  const { existing, skipped } = parseExistingCatalogue(
    toFirestoreDocs(shopsSnapshot.docs),
    toFirestoreDocs(categoriesSnapshot.docs),
    toFirestoreDocs(catalogueItemsSnapshot.docs),
  );
  for (const doc of skipped) {
    console.warn(`referenceCount backfill: skipping ${doc.collection}/${doc.id}: ${doc.reason}`);
  }

  const { shops, categories } = computeReferenceCounts(existing);

  const shopsAlreadyCounted = new Set(
    shopsSnapshot.docs.filter((doc) => doc.data().referenceCount !== undefined).map((doc) => doc.id),
  );
  const categoriesAlreadyCounted = new Set(
    categoriesSnapshot.docs
      .filter((doc) => doc.data().referenceCount !== undefined)
      .map((doc) => doc.id),
  );

  await writeReferenceCounts(SHOPS_COLLECTION, shops, shopsAlreadyCounted);
  await writeReferenceCounts(CATEGORIES_COLLECTION, categories, categoriesAlreadyCounted);
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
