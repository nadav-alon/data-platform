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
 * which then finds this Auth through `getAuth`.
 */
export function initLocalAuth(app: FirebaseApp): Auth {
  return initLocalAuthWith(initializeAuth, app);
}

/** `initLocalAuth` with `initializeAuth` injected so a test can observe the options; `index.ts` does not export it. */
export function initLocalAuthWith(init: typeof initializeAuth, app: FirebaseApp): Auth {
  return init(app, {
    persistence: inMemoryPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
}
