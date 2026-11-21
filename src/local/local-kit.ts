import type { LocalKit } from "../client/init-firebase.ts";
import { connectLocal } from "./connect-local.ts";
import { initLocalAuth } from "./init-local-auth.ts";

/** The wiring `initFirebase(config, { local: localKit })` runs to point an app at the emulators. */
export const localKit: LocalKit = { connectLocal, initLocalAuth };
