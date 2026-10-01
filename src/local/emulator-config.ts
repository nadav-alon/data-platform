/**
 * A `demo-` project ID makes the Firebase tooling refuse any call to a real project, so the
 * local kit can never read or write a live Household whatever credentials are on the machine.
 */
export const LOCAL_PROJECT_ID = "demo-data-platform-local";

export const EMULATOR_HOST = "127.0.0.1";

/** Matches `firebase.json`, so the rules suite and the local kit share one set of ports. */
export const FIRESTORE_EMULATOR_PORT = 8090;
export const AUTH_EMULATOR_PORT = 9099;
