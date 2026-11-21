import { firebaseWebConfig } from "../client/web-config.ts";
import { LOCAL_PROJECT_ID } from "./emulator-config.ts";

/**
 * The web config for local mode: pass it to `initFirebase` with `{ local: localKit }`. Every field
 * but `projectId` is a placeholder, since the emulators check none of them.
 */
export const LOCAL_WEB_CONFIG = firebaseWebConfig({
  apiKey: "local",
  authDomain: `${LOCAL_PROJECT_ID}.firebaseapp.com`,
  projectId: LOCAL_PROJECT_ID,
  storageBucket: `${LOCAL_PROJECT_ID}.appspot.com`,
  messagingSenderId: "0",
  appId: "1:0:web:local",
});
