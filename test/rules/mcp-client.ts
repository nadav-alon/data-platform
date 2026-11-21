import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { seedAuthUsers } from "../../src/local/auth-users.ts";
import { withEmulatorWriter } from "../../src/local/admin-writer.ts";
import { SCENARIOS, seedScenario, type ScenarioName } from "../../src/local/scenarios.ts";

const projectId = process.env.GCLOUD_PROJECT;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;

/** Wipes the test project's Auth accounts, then seeds `name`'s users and fixtures. */
export async function seedLocalHousehold(name: ScenarioName): Promise<void> {
  if (!projectId || !authHost || !firestoreHost) {
    throw new Error("run this suite through `npm run test:rules`");
  }
  await fetch(`http://${authHost}/emulator/v1/projects/${projectId}/accounts`, {
    method: "DELETE",
  });
  await seedAuthUsers(SCENARIOS[name].users, { projectId, host: authHost });
  await withEmulatorWriter((writer) => seedScenario(writer, name), {
    projectId,
    host: firestoreHost,
  });
}

/** What the Auth emulator accepts as a Google id token for `email`. */
export function fakeGoogleIdToken(email: string): string {
  return JSON.stringify({ sub: `google-${email}`, email, email_verified: true });
}

/** A Firestore client of the test project, signed in with a fake Google id token for `email`. */
export async function signedInClient(
  email: string,
  signIn: (app: FirebaseApp, idToken: string) => Promise<unknown> = (app, idToken) =>
    signInWithCredential(getAuth(app), GoogleAuthProvider.credential(idToken)),
): Promise<{ db: Firestore; close: () => Promise<void> }> {
  const app = initializeApp(
    { projectId, apiKey: "fake" },
    `mcp-test-${Date.now()}-${Math.random()}`,
  );
  const [host, port] = (firestoreHost ?? "").split(":");
  connectAuthEmulator(getAuth(app), `http://${authHost}`, { disableWarnings: true });
  connectFirestoreEmulator(getFirestore(app), host ?? "", Number(port));
  await signIn(app, fakeGoogleIdToken(email));
  return { db: getFirestore(app), close: () => deleteApp(app) };
}
