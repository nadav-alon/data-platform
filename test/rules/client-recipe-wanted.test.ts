import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, getFirestore, type Firestore } from "firebase/firestore";
import { setIngredientBought, setRecipeWanted } from "../../src/client/index.ts";
import { RECIPES_COLLECTION, recipeId } from "../../src/recipes/recipe.ts";
import { seedHousehold, seedMember, seedRecipe } from "./seed.ts";
import { uid } from "../../src/core/uid.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const rulesTestEnv = setupRulesTestEnv();

const projectId = process.env.GCLOUD_PROJECT;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const pancakes = recipeId("pancakes");

let appCount = 0;

/** Runs `body` against a fresh app signed in through the Auth emulator as `address`, then tears it down. */
async function asUser(address: string, body: (db: Firestore, userUid: string) => Promise<void>): Promise<void> {
  assert.ok(projectId && authHost && firestoreHost, "run this suite through `npm run test:rules`");
  const app: FirebaseApp = initializeApp({ projectId, apiKey: "fake" }, `client-recipe-wanted-${appCount++}`);
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
    const idToken = JSON.stringify({ sub: `google-${address}`, email: address, email_verified: true });
    const { user } = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    const db = getFirestore(app);
    const [host, port] = firestoreHost.split(":");
    connectFirestoreEmulator(db, host as string, Number(port), { mockUserToken: await user.getIdToken() });
    await body(db, user.uid);
  } finally {
    await deleteApp(app);
  }
}

const stored = async (db: Firestore) => (await getDoc(doc(db, RECIPES_COLLECTION, pancakes))).data();

test("a Member sets a Recipe Wanted, buys an Unlinked Ingredient, and un-Wanting clears the bought", async () => {
  await seedHousehold(rulesTestEnv.env, uid("alice"));
  await seedRecipe(rulesTestEnv.env, "pancakes");
  await asUser("member@example.com", async (db, me) => {
    await seedMember(rulesTestEnv.env, uid(me));

    await assert.rejects(setIngredientBought(db, pancakes, "Flour", true), { code: "permission-denied" });
    await setRecipeWanted(db, pancakes, true);
    await setIngredientBought(db, pancakes, "Flour", true);
    assert.deepEqual(await stored(db).then((d) => [d?.wanted, d?.boughtIngredients]), [true, { Flour: true }]);

    await setIngredientBought(db, pancakes, "Flour", false);
    assert.deepEqual((await stored(db))?.boughtIngredients, {});

    await setIngredientBought(db, pancakes, "Flour", true);
    await setRecipeWanted(db, pancakes, false);
    const after = await stored(db);
    assert.equal("wanted" in (after ?? {}), false);
    assert.equal("boughtIngredients" in (after ?? {}), false);
  });
});

test("a non-Member's Wanted and bought writes are refused by the rules", async () => {
  await seedHousehold(rulesTestEnv.env, uid("alice"));
  await seedRecipe(rulesTestEnv.env, "pancakes");
  await asUser("mallory@example.com", async (db) => {
    await assert.rejects(setRecipeWanted(db, pancakes, true), { code: "permission-denied" });
    await assert.rejects(setIngredientBought(db, pancakes, "Flour", true), { code: "permission-denied" });
  });
});
