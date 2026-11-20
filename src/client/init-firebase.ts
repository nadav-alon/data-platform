import { initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import {
  EMULATOR_HOST,
  FIRESTORE_EMULATOR_PORT,
  LOCAL_PROJECT_ID,
} from "../local/emulator-config.ts";

export type FirebaseClient = { readonly app: FirebaseApp; readonly db: Firestore };

export type InitFirebaseOptions = {
  /**
   * Connects Firestore to the local kit's emulator with a memory cache, so a local run neither
   * touches a live Household nor keeps data between reloads. The config's `projectId` must be
   * `LOCAL_PROJECT_ID`, the one project the local kit seeds.
   */
  readonly local?: boolean;
};

/** The Firebase calls `initFirebase` makes, injectable so a test can observe the arguments. */
export type FirebaseDeps = {
  readonly initializeApp: typeof initializeApp;
  readonly initializeFirestore: typeof initializeFirestore;
  readonly connectFirestoreEmulator: typeof connectFirestoreEmulator;
};

const FIREBASE_DEPS: FirebaseDeps = { initializeApp, initializeFirestore, connectFirestoreEmulator };

/**
 * Initializes the Firebase app and a Firestore whose persistent local cache is shared across
 * tabs, so reads and writes keep working offline and queued writes survive a reload. Call it once
 * per page: Firebase rejects a second Firestore with different settings on the same app.
 */
export function initFirebase(
  config: FirebaseOptions,
  options: InitFirebaseOptions = {},
): FirebaseClient {
  return initFirebaseWith(FIREBASE_DEPS, config, options);
}

/** `initFirebase` with the Firebase calls injected; `index.ts` does not export it. */
export function initFirebaseWith(
  deps: FirebaseDeps,
  config: FirebaseOptions,
  options: InitFirebaseOptions = {},
): FirebaseClient {
  if (options.local && config.projectId !== LOCAL_PROJECT_ID) {
    throw new Error(
      `initFirebase in local mode needs projectId ${JSON.stringify(LOCAL_PROJECT_ID)}, got ${JSON.stringify(config.projectId)}`,
    );
  }
  const app = deps.initializeApp(config);
  const db = deps.initializeFirestore(app, {
    localCache: options.local
      ? memoryLocalCache()
      : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (options.local) deps.connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  return { app, db };
}
