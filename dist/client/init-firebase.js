import { initializeApp } from "firebase/app";
import { initializeFirestore, memoryLocalCache, persistentLocalCache, } from "firebase/firestore";
import { connectLocal } from "../local/connect-local.js";
import { initLocalAuth } from "../local/init-local-auth.js";
const FIREBASE_DEPS = {
    initializeApp,
    initializeFirestore,
    initLocalAuth,
    connectLocal,
};
/**
 * Initializes the Firebase app and a Firestore with a persistent local cache, so reads and writes
 * keep working offline and queued writes survive a reload. Call it once per page: Firebase
 * rejects a second Firestore with different settings on the same app.
 */
export function initFirebase(config, options = {}) {
    return initFirebaseWith(FIREBASE_DEPS, config, options);
}
/** `initFirebase` with the calls injected; `index.ts` does not export it. */
export function initFirebaseWith(deps, config, options = {}) {
    const app = deps.initializeApp(config);
    if (!options.local) {
        return { app, db: deps.initializeFirestore(app, { localCache: persistentLocalCache() }) };
    }
    const db = deps.initializeFirestore(app, { localCache: memoryLocalCache() });
    // Auth first: `connectLocal` reaches it through `getAuth`, which would otherwise create a
    // default Auth with no popup resolver. `connectLocal` also owns the project-ID guard.
    deps.initLocalAuth(app);
    deps.connectLocal(app);
    return { app, db };
}
