import { initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import type { Auth } from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";
export type FirebaseClient = {
    readonly app: FirebaseApp;
    readonly db: Firestore;
};
/**
 * The local kit's wiring, supplied by `data-platform/local` as `localKit`. `initFirebase` takes it
 * as an argument rather than importing it, so an app that never imports `data-platform/local`
 * ships none of the kit.
 */
export type LocalKit = {
    readonly connectLocal: (app: FirebaseApp) => void;
    readonly initLocalAuth: (app: FirebaseApp) => Auth;
};
export type InitFirebaseOptions = {
    /**
     * Runs against the local kit: a memory cache, so a local run neither touches a live Household
     * nor keeps data between reloads, and Auth (in memory, with the popup resolver) and Firestore
     * both pointed at the emulators. Pass `localKit` from `data-platform/local`; the config's
     * `projectId` must be that kit's `LOCAL_PROJECT_ID`. Do not also call `connectLocal`: this
     * already has.
     */
    readonly local?: LocalKit;
};
/** The Firebase calls `initFirebase` makes, injectable so a test can observe them. */
export type FirebaseDeps = {
    readonly initializeApp: typeof initializeApp;
    readonly initializeFirestore: typeof initializeFirestore;
};
/**
 * Initializes the Firebase app and a Firestore with a persistent local cache, so reads and writes
 * keep working offline and queued writes survive a reload. Call it once per page: Firebase
 * rejects a second Firestore with different settings on the same app.
 */
export declare function initFirebase(config: FirebaseOptions, options?: InitFirebaseOptions): FirebaseClient;
/** `initFirebase` with the calls injected; `index.ts` does not export it. */
export declare function initFirebaseWith(deps: FirebaseDeps, config: FirebaseOptions, options?: InitFirebaseOptions): FirebaseClient;
