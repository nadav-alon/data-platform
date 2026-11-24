import { deleteApp, initializeApp } from "firebase/app";
import { initializeFirestore, memoryLocalCache, persistentLocalCache, persistentMultipleTabManager, terminate, } from "firebase/firestore";
const FIREBASE_DEPS = {
    initializeApp,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
};
/**
 * Initializes the Firebase app and a Firestore with a persistent local cache, so reads and writes
 * keep working offline and queued writes survive a reload. The cache is shared across tabs and
 * across platform apps on the same origin and project, which all open the same on-disk cache, so
 * each of them keeps it rather than one owning it and the rest falling back to memory. That holds
 * as long as every app on the origin initializes through this release with the default Firebase
 * app name; they also share one Auth session. Call it
 * once per page: Firebase rejects a second Firestore with different settings on the same app. A
 * reset that needs a different config calls `terminateFirebase` first, then `initFirebase` again.
 */
export function initFirebase(config, options = {}) {
    return initFirebaseWith(FIREBASE_DEPS, config, options);
}
/** `initFirebase` with the calls injected; `index.ts` does not export it. */
export function initFirebaseWith(deps, config, options = {}) {
    const app = deps.initializeApp(config);
    const { local } = options;
    if (!local) {
        const localCache = deps.persistentLocalCache({
            tabManager: deps.persistentMultipleTabManager(),
        });
        return { app, db: deps.initializeFirestore(app, { localCache }) };
    }
    const db = deps.initializeFirestore(app, { localCache: memoryLocalCache() });
    // Auth first: `connectLocal` reaches it through `getAuth`, which would otherwise create a
    // default Auth with no popup resolver. `connectLocal` also owns the project-ID guard.
    local.initLocalAuth(app);
    local.connectLocal(app);
    return { app, db };
}
const TERMINATE_DEPS = { terminate, deleteApp };
/**
 * Tears down what `initFirebase` made: terminates Firestore, then deletes the app, so a reset can
 * call `initFirebase` again from a different config. Resolves once both are done. Deleting the app
 * also tears down its Auth, both the `initLocalAuth` instance and any `getAuth(app)`, so there is
 * no separate sign-out or Auth teardown. The client is unusable afterwards; drop every reference to it, and to listeners attached through it.
 */
export function terminateFirebase(client) {
    return terminateFirebaseWith(TERMINATE_DEPS, client);
}
/** `terminateFirebase` with the calls injected; `index.ts` does not export it. */
export async function terminateFirebaseWith(deps, client) {
    await deps.terminate(client.db);
    await deps.deleteApp(client.app);
}
