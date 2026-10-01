import type { FirebaseApp } from "firebase/app";
import {
  type Auth,
  browserPopupRedirectResolver,
  inMemoryPersistence,
  initializeAuth,
} from "firebase/auth";

/**
 * Creates a Firebase web app's Auth for local runs: `inMemoryPersistence`, so every run starts
 * signed out, and `browserPopupRedirectResolver`, so `signInWithPopup` can open the Auth
 * emulator's Google sign-in popup (`initializeAuth` without a resolver makes it throw
 * `auth/argument-error`). Call it right after `initializeApp` and before {@link connectLocal},
 * which then finds this Auth through `getAuth`. `init` is the `initializeAuth` to call, so a test
 * can observe the options.
 */
export function initLocalAuth(app: FirebaseApp, init: typeof initializeAuth = initializeAuth): Auth {
  return init(app, {
    persistence: inMemoryPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
}
