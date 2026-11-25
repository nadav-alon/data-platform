import { connectLocal } from "./connect-local.js";
import { initLocalAuth } from "./init-local-auth.js";
/** The wiring `initFirebase(config, { local: localKit })` runs to point an app at the emulators. */
export const localKit = { connectLocal, initLocalAuth };
