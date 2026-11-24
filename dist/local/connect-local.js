import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { AUTH_EMULATOR_PORT, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT, LOCAL_PROJECT_ID, } from "./emulator-config.js";
import { emulatorHost, splitEmulatorHost } from "./emulator-host.js";
/**
 * Points a Firebase web app's Auth and Firestore at the local emulators the `data-platform-local`
 * bin starts. Call it once, right after `initializeApp` and before the app's first Auth or
 * Firestore call: Firebase refuses to re-point an instance that has already been used. Throws
 * unless the app was initialized with {@link LOCAL_PROJECT_ID}: the emulators namespace data per
 * project and the bin seeds only that one. `authHost` and `firestoreHost` (`host:port` each; a malformed one throws)
 * override the default ports for emulators running on others, such as the
 * `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST` that `firebase emulators:exec` sets.
 */
export function connectLocal(app, { authHost = `${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, firestoreHost = `${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}`, } = {}) {
    if (app.options.projectId !== LOCAL_PROJECT_ID) {
        throw new Error(`connectLocal needs an app initialized with projectId ${JSON.stringify(LOCAL_PROJECT_ID)}, got ${JSON.stringify(app.options.projectId)}`);
    }
    const auth = emulatorHost(authHost);
    const firestore = splitEmulatorHost(emulatorHost(firestoreHost));
    connectAuthEmulator(getAuth(app), `http://${auth}`, {
        disableWarnings: true,
    });
    connectFirestoreEmulator(getFirestore(app), firestore.host, firestore.port);
}
