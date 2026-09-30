import type { FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import {
  AUTH_EMULATOR_PORT,
  EMULATOR_HOST,
  FIRESTORE_EMULATOR_PORT,
  LOCAL_PROJECT_ID,
} from "./emulator-config.ts";

/**
 * Points a Firebase web app's Auth and Firestore at the local emulators the `data-platform-local`
 * bin starts. Call it once, right after `initializeApp` and before the app's first Auth or
 * Firestore call: Firebase refuses to re-point an instance that has already been used. Throws
 * unless the app was initialized with {@link LOCAL_PROJECT_ID}: the emulators namespace data per
 * project and the bin seeds only that one.
 */
export function connectLocal(app: FirebaseApp): void {
  if (app.options.projectId !== LOCAL_PROJECT_ID) {
    throw new Error(
      `connectLocal needs an app initialized with projectId ${JSON.stringify(LOCAL_PROJECT_ID)}, got ${JSON.stringify(app.options.projectId)}`,
    );
  }
  connectAuthEmulator(getAuth(app), `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, {
    disableWarnings: true,
  });
  connectFirestoreEmulator(getFirestore(app), EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
}
