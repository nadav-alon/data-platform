import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import {
  claimHousehold,
  householdExists,
  isHouseholdMember,
  joinFromInvite,
} from "../../src/client/index.ts";
import { email, type Email } from "../../src/core/email.ts";
import { uid, type Uid } from "../../src/core/uid.ts";
import { seedHousehold, seedInvite } from "./seed.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const ref = setupRulesTestEnv();

const projectId = process.env.GCLOUD_PROJECT;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;

let appCount = 0;

/** Signs a fresh app in through the Auth emulator as a verified Google `address`, and returns its Firestore and uid. */
async function signIn(address: string): Promise<{ db: Firestore; uid: Uid; app: FirebaseApp }> {
  assert.ok(projectId && authHost && firestoreHost, "run this suite through `npm run test:rules`");
  const app = initializeApp({ projectId, apiKey: "fake" }, `client-household-${appCount++}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const idToken = JSON.stringify({ sub: `google-${address}`, email: address, email_verified: true });
  const { user } = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  const db = getFirestore(app);
  const [host, port] = firestoreHost.split(":");
  connectFirestoreEmulator(db, host as string, Number(port), {
    mockUserToken: await user.getIdToken(),
  });
  return { db, uid: uid(user.uid), app };
}

/** Runs `body` as a signed-in `address`, then tears the app down. */
async function asUser(
  address: string,
  body: (user: { db: Firestore; uid: Uid; email: Email }) => Promise<void>,
): Promise<void> {
  const { db, uid: userUid, app } = await signIn(address);
  try {
    await body({ db, uid: userUid, email: email(address) });
  } finally {
    await deleteApp(app);
  }
}

test("claimHousehold: the first signed-in user claims the Household and becomes a Member", async () => {
  await asUser("Owner@Example.com", async ({ db, uid: me, email: addr }) => {
    assert.equal(await householdExists(db), false);
    assert.equal(await isHouseholdMember(db, me), false);

    await claimHousehold(db, me, addr);

    assert.equal(await householdExists(db), true);
    assert.equal(await isHouseholdMember(db, me), true);
  });
});

test("claimHousehold: a second claim of a claimed Household is refused", async () => {
  await seedHousehold(ref.env, uid("alice"));
  await asUser("mallory@example.com", async ({ db, uid: me, email: addr }) => {
    await assert.rejects(claimHousehold(db, me, addr), { code: "permission-denied" });
    assert.equal(await isHouseholdMember(db, me), false);
  });
});

test("joinFromInvite: an invited user joins, and the Invite is spent", async () => {
  await seedHousehold(ref.env, uid("alice"));
  await seedInvite(ref.env, email("guest@example.com"));
  await asUser("Guest@Example.com", async ({ db, uid: me, email: addr }) => {
    assert.equal(await joinFromInvite(db, me, addr), true);
    assert.equal(await isHouseholdMember(db, me), true);
    assert.equal(await joinFromInvite(db, me, addr), false);
  });
});

test("joinFromInvite: a non-invited user's join is refused and leaves them a non-member", async () => {
  await seedHousehold(ref.env, uid("alice"));
  await seedInvite(ref.env, email("guest@example.com"));
  await asUser("mallory@example.com", async ({ db, uid: me, email: addr }) => {
    assert.equal(await joinFromInvite(db, me, addr), false);
    assert.equal(await isHouseholdMember(db, me), false);
  });
});
