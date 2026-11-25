import type { FirebaseApp } from "firebase/app";
/**
 * Points a Firebase web app's Auth and Firestore at the local emulators the `data-platform-local`
 * bin starts. Call it once, right after `initializeApp` and before the app's first Auth or
 * Firestore call: Firebase refuses to re-point an instance that has already been used. Throws
 * unless the app was initialized with {@link LOCAL_PROJECT_ID}: the emulators namespace data per
 * project and the bin seeds only that one. `authHost` and `firestoreHost` (`host:port` each; a malformed one throws)
 * override the default ports for emulators running on others, such as the
 * `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST` that `firebase emulators:exec` sets.
 */
export declare function connectLocal(app: FirebaseApp, { authHost, firestoreHost, }?: {
    authHost?: string;
    firestoreHost?: string;
}): void;
