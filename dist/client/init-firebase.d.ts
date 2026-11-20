import { initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { initializeFirestore, type Firestore } from "firebase/firestore";
import { connectLocal } from "../local/connect-local.ts";
import { initLocalAuth } from "../local/init-local-auth.ts";
export type FirebaseClient = {
    readonly app: FirebaseApp;
    readonly db: Firestore;
};
export type InitFirebaseOptions = {
    /**
     * Runs against the local kit: a memory cache, so a local run neither touches a live Household
     * nor keeps data between reloads, and Auth (in memory, with the popup resolver) and Firestore
     * both pointed at the emulators. The config's `projectId` must be `LOCAL_PROJECT_ID`. Do not
     * also call `connectLocal`: this already has.
     */
    readonly local?: boolean;
};
/** The Firebase and local-kit calls `initFirebase` makes, injectable so a test can observe them. */
export type FirebaseDeps = {
    readonly initializeApp: typeof initializeApp;
    readonly initializeFirestore: typeof initializeFirestore;
    readonly initLocalAuth: typeof initLocalAuth;
    readonly connectLocal: typeof connectLocal;
};
/**
 * Initializes the Firebase app and a Firestore with a persistent local cache, so reads and writes
 * keep working offline and queued writes survive a reload. Call it once per page: Firebase
 * rejects a second Firestore with different settings on the same app.
 */
export declare function initFirebase(config: FirebaseOptions, options?: InitFirebaseOptions): FirebaseClient;
/** `initFirebase` with the calls injected; `index.ts` does not export it. */
export declare function initFirebaseWith(deps: FirebaseDeps, config: FirebaseOptions, options?: InitFirebaseOptions): FirebaseClient;
