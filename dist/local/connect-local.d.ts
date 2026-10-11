import type { FirebaseApp } from "firebase/app";
/**
 * Points a Firebase web app's Auth and Firestore at the local emulators the `data-platform-local`
 * bin starts. Call it once, right after `initializeApp` and before the app's first Auth or
 * Firestore call: Firebase refuses to re-point an instance that has already been used. Throws
 * unless the app was initialized with {@link LOCAL_PROJECT_ID}: the emulators namespace data per
 * project and the bin seeds only that one.
 */
export declare function connectLocal(app: FirebaseApp): void;
